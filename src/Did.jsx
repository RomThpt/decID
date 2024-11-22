import React, { useState } from "react";
import { Client, Wallet } from "xrpl";

const DIDComponent = () => {
    const [client] = useState(
        new Client("wss://s.altnet.rippletest.net:51233")
    ); // Testnet client
    const [wallet, setWallet] = useState(null);
    const [status, setStatus] = useState("Not connected to XRPL");
    const [didData, setDidData] = useState({
        data: "",
        didDocument: "",
        uri: "",
    });
    const [didEntry, setDidEntry] = useState(null);

    // Connect to XRPL Client
    const connectClient = async () => {
        try {
            if (!client.isConnected()) {
                await client.connect();
                setStatus("Connected to XRPL Testnet");
            }
        } catch (error) {
            console.error("Error connecting to XRPL:", error);
            setStatus("Error connecting to XRPL");
        }
    };

    // Generate Wallet
    const generateWallet = async () => {
        const newWallet = Wallet.generate();
        setWallet(newWallet);
        setStatus(`Wallet created: ${newWallet.classicAddress}`);
    };

    // Fund Wallet Using Faucet
    const fundWallet = async () => {
        if (!wallet) {
            setStatus("No wallet available. Generate a wallet first.");
            return;
        }
        try {
            setStatus("Requesting funds from the Testnet faucet...");
            const response = await fetch(
                `https://faucet.altnet.rippletest.net/accounts`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        destination: wallet.classicAddress,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Faucet request failed: ${response.statusText}`
                );
            }

            const result = await response.json();
            console.log("Faucet response:", result);

            setStatus(`Wallet funded successfully: ${wallet.classicAddress}`);
        } catch (error) {
            console.error("Error funding wallet:", error);
            setStatus(`Error funding wallet: ${error.message}`);
        }
    };

    // Submit DIDSet Transaction
    const createDID = async () => {
        try {
            await connectClient();

            if (!wallet) {
                setStatus(
                    "No wallet available. Generate and fund a wallet first."
                );
                return;
            }

            setStatus("Submitting DIDSet transaction...");

            const transaction = {
                TransactionType: "DIDSet",
                Account: wallet.classicAddress,
                Data: didData.data ? toHex(didData.data) : undefined,
                DIDDocument: didData.didDocument
                    ? toHex(didData.didDocument)
                    : undefined,
                URI: didData.uri ? toHex(didData.uri) : undefined,
            };

            // Prepare and sign the transaction
            const prepared = await client.autofill(transaction);
            const signed = wallet.sign(prepared);

            // Submit the transaction
            const response = await client.submitAndWait(signed.tx_blob);

            // Check result
            if (response.result.validated === true) {
                setStatus(`Transaction successful! Hash: ${signed.hash}`);
            } else {
                // Log detailed response
                console.error("Transaction failed response:", response);
                setStatus(
                    `Transaction failed: ${
                        result.resultMessage || "Unknown error"
                    }`
                );
            }
        } catch (error) {
            console.error("Error creating DID:", error);

            if (error.data && error.data.error === "actNotFound") {
                setStatus(
                    "Account not activated. Fund the account using the Testnet faucet."
                );
            } else if (error.message) {
                setStatus(`Error creating DID: ${error.message}`);
            } else {
                setStatus("An unknown error occurred during DID creation.");
            }
        }
    };
    const fetchDID = async () => {
        try {
            await connectClient();

            if (!wallet) {
                setStatus(
                    "No wallet available. Generate and fund a wallet first."
                );
                return;
            }

            setStatus("Fetching DID ledger entry...");

            const response = await client.request({
                command: "ledger_entry",
                ledger_index: "validated",
                index: wallet.getXAddress(), // Use the correct index for the DID ledger entry
            });

            setDidEntry({
                Account: response.result.node.Account,
                DIDDocument: response.result.node.DIDDocument,
                Data: response.result.node.Data,
                Flags: response.result.node.Flags,
                LedgerEntryType: response.result.node.LedgerEntryType,
                OwnerNode: response.result.node.OwnerNode,
                PreviousTxnID: response.result.node.PreviousTxnID,
                PreviousTxnLgrSeq: response.result.node.PreviousTxnLgrSeq,
                URI: response.result.node.URI,
                index: response.result.index,
            });

            setStatus("DID ledger entry retrieved successfully.");
        } catch (error) {
            console.error("Error fetching DID entry:", error);
            setStatus("Error fetching DID ledger entry.");
        }
    };

    // Utility function to hex-encode strings
    const toHex = (str) => Buffer.from(str, "utf8").toString("hex");

    return (
        <div>
            <h1>DID Management on XRPL</h1>
            <p>Status: {status}</p>
            <button onClick={connectClient}>Connect to XRPL</button>
            <button onClick={generateWallet}>Generate Wallet</button>
            <button onClick={fundWallet} disabled={!wallet}>
                Fund Wallet
            </button>
            <div>
                <h2>Create DID</h2>
                <input
                    type="text"
                    placeholder="Data"
                    value={didData.data}
                    onChange={(e) =>
                        setDidData({ ...didData, data: e.target.value })
                    }
                />
                <input
                    type="text"
                    placeholder="DID Document"
                    value={didData.didDocument}
                    onChange={(e) =>
                        setDidData({ ...didData, didDocument: e.target.value })
                    }
                />
                <input
                    type="text"
                    placeholder="URI"
                    value={didData.uri}
                    onChange={(e) =>
                        setDidData({ ...didData, uri: e.target.value })
                    }
                />
                <button onClick={createDID} disabled={!wallet}>
                    Submit DIDSet Transaction
                </button>
            </div>
            <div>
                <h2>Fetch DID Entry</h2>
                <button onClick={fetchDID}>Fetch DID</button>
                {didEntry && <pre>{JSON.stringify(didEntry, null, 2)}</pre>}
            </div>
        </div>
    );
};

export default DIDComponent;

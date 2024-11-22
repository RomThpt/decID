import React, { useState } from "react";
import { Client, Wallet } from "xrpl";
import { pinata } from "./EncryptDidDocument.jsx";

// URL pointing to the DID document that will be registered on the XRP Ledger
const DID_DOCUMENT_URL =
    "ipfs://QmQxi8w49jC66v1JU7Qih6YEZSHjbBdLqJBPcCVVK6WqDX";

const DIDComponent = () => {
    const [didTransaction, setDidTransaction] = useState("");
    const [status, setStatus] = useState("Not connected to XRPL");
    const [wallet, setWallet] = useState(null);
    const [client] = useState(
        new Client("wss://s.altnet.rippletest.net:51233")
    );
    const [selectedFile, setSelectedFile] = useState();

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

    const generateWallet = async () => {
        const newWallet = Wallet.generate();
        setWallet(newWallet);
        setStatus(`Wallet created: ${newWallet.classicAddress}`);
    };

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

    const handlePinata = async (didDocument) => {
        try {
            // Convert the DID document into a Blob
            const blob = new Blob([JSON.stringify(didDocument, null, 2)], {
                type: "application/json",
            });

            // Create a File object (optional, if you need a filename)
            const file = new File([blob], "did-document.json", {
                type: "application/json",
            });

            // Create a FormData instance and append the file
            const formData = new FormData();
            formData.append("file", file);

            await pinata.upload.file(formData).then((result) => {});

            // // Upload to Pinata using their API
            // const response = await fetch(
            //     "https://api.pinata.cloud/pinning/pinFileToIPFS",
            //     {
            //         method: "POST",
            //         headers: {
            //             Authorization: `Bearer YOUR_PINATA_JWT_TOKEN`, // Replace with your actual token
            //         },
            //         body: formData,
            //     }
            // );

            // if (!response.ok) {
            //     throw new Error("Failed to upload file to Pinata");
            // }

            // const result = await response.json();
            // console.log("Uploaded to Pinata:", result);
            // alert(
            //     `File uploaded successfully! IPFS URL: https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`
            // );
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("File upload failed. Check the console for more details.");
        }
    };

    const connectWallet = () => {
        setWallet(Wallet.fromSeed("sEd7diyVTjATP3n64LyaTBGEJVt2sji"));
        setStatus("Wallet connected");
    };

    const handleGenerateDID = async () => {
        if (!wallet) {
            setStatus("No wallet available. Generate a wallet first.");
            return;
        }
        setStatus("Generating DID document...");
        const { classicAddress, publicKey } = wallet;

        // TODO : Add with pinata or eeciesjs
        const didDocument = JSON.stringify({
            "@context": "https://www.w3.org/ns/did/v1",
            id: `did:xrpl:${classicAddress}`,
            authentication: [
                {
                    type: "Ed25519VerificationKey2020",
                    publicKeyMultibase: `z${publicKey}`,
                },
            ],
        });
        // handlePinata(didDocument);
        try {
            const preparedTransaction = await client.autofill({
                TransactionType: "DIDSet",
                Account: classicAddress,
                URI: Buffer.from(DID_DOCUMENT_URL).toString("hex"),
            });

            const signedTransaction = wallet.sign(preparedTransaction);
            const result = await client.submitAndWait(
                signedTransaction.tx_blob
            );

            setDidTransaction(JSON.stringify(result, null, 2));
            setStatus("DID transaction completed successfully.");
        } catch (error) {
            console.error("Error preparing DIDSet transaction:", error);
            setStatus("Error preparing DIDSet transaction");
        }
    };

    return (
        <div>
            <h1>Générer un DID et un Credential via XRPL</h1>
            <p>Status: {status}</p>
            <button onClick={connectClient}>Connect to XRPL</button>
            <button onClick={generateWallet}>Generate Wallet</button>
            <button onClick={fundWallet} disabled={!wallet}>
                Fund Wallet
            </button>
            <br />
            <button onClick={connectWallet}>Connect Wallet</button>
            <div>
                <h3>Génération de la paire de clés et DID</h3>
                <button onClick={handleGenerateDID}>Générer le DID</button>
            </div>

            {didTransaction && (
                <div>
                    <h3>Transaction DIDSet:</h3>
                    <pre>{didTransaction}</pre>
                </div>
            )}
            {/* <p>
                {didTransaction.meta.AffectedNodes[0].CreatedNode.LedgerIndex}
            </p> */}
        </div>
    );
};

export default DIDComponent;

import React, { useState } from "react";
import { Client, Wallet } from "xrpl";
import { pinata } from "./EncryptDidDocument.jsx";
import './Did.css'

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
        <div className="did-container">
          <h1 className="did-title">Generate a DID and a Credential via XRPL</h1>
          <p className="did-status">Status: {status}</p>
          <div className="did-buttons">
            <button onClick={connectClient} className="did-button connect">
              Connect to XRPL
            </button>
            <button onClick={generateWallet} className="did-button wallet">
              Generate Wallet
            </button>
            <button
              onClick={fundWallet}
              className={`did-button fund ${!wallet ? "disabled" : ""}`}
              disabled={!wallet}
            >
              Fund Wallet
            </button>
            <button onClick={connectWallet} className="did-button wallet">
              Connect Wallet
            </button>
          </div>
          <div className="did-section">
            <button onClick={handleGenerateDID} className="did-button did">
              Generate the DID
            </button>
          </div>
          {didTransaction && (
            <div className="did-transaction">
              <h3>Transaction DIDSet:</h3>
              <pre>{didTransaction}</pre>
            </div>
          )}
        </div>
      );      
};

export default DIDComponent;

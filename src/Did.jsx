import React, { useState } from "react";
import { Client, Wallet } from "xrpl";

// URL pointing to the DID document that will be registered on the XRP Ledger
const DID_DOCUMENT_URL =
    "https://bafybeibg6qulsbojjteg737cibb2gpoplspwus3jxpwkz2xjr4kwsdw4vy.ipfs.dweb.link?filename=didDocument.json";

// Sample encrypted VC data for demonstration purposes
const encryptedVCData = {
    credentials: [
        {
            id: "https://example.org/credentials/3732",
            encryptedVC: "Base64EncodedEncryptedData", // Replace with actual encrypted VC
            encryptionMetadata: {
                algorithm: "RSA-OAEP",
                key: "Base64EncodedPublicKeyOfRecipient", // Replace with actual public key
                nonce: "RandomNonce", // Replace with actual nonce used for encryption
            },
        },
    ],
};

const DIDComponent = () => {
    const [didTransaction, setDidTransaction] = useState("");
    const [status, setStatus] = useState("Not connected to XRPL");
    const [wallet, setWallet] = useState(null);
    const [client] = useState(
        new Client("wss://s.altnet.rippletest.net:51233")
    );

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

    const handleGenerateDID = async () => {
        if (!wallet) {
            setStatus("No wallet available. Generate a wallet first.");
            return;
        }

        const { classicAddress, publicKey } = wallet;

        // Generate the DID Document
        const didDocument = {
            "@context": "https://www.w3.org/ns/did/v1",
            id: `did:xrpl:${classicAddress}`, // Use the wallet address as part of the DID
            authentication: [
                {
                    type: "Ed25519VerificationKey2020",
                    publicKeyMultibase: `z${publicKey}`, // Ensure public key is in base58 format
                },
            ],
        };

        // Prepare the DIDSet transaction
        try {
            const preparedTransaction = await client.autofill({
                TransactionType: "DIDSet",
                Account: classicAddress,
                URI: Buffer.from(DID_DOCUMENT_URL).toString("hex"), // Convert URL to hex format
            });

            // Sign and submit the DIDSet transaction
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

    // Handle the secure storage of the encrypted VC (store locally)
    const handleStoreVC = async () => {
        try {
            if (!wallet) {
                setStatus("No wallet available. Generate a wallet first.");
                return;
            }

            // Save the encrypted VC to the wallet (in a local storage format)
            const vcData = {
                credentials: [
                    {
                        id: encryptedVCData.credentials[0].id,
                        encryptedVC: encryptedVCData.credentials[0].encryptedVC,
                        encryptionMetadata:
                            encryptedVCData.credentials[0].encryptionMetadata,
                    },
                ],
            };

            // Here we can store the VC securely in localStorage or a decentralized storage option
            // For local storage example:
            localStorage.setItem("encryptedVC", JSON.stringify(vcData));
            setStatus("Encrypted VC stored securely in local storage.");

            // For decentralized storage (e.g., IPFS or Arweave), we could use a package like `ipfs-http-client`
            // or other decentralized storage services, but that requires additional setup and authentication.
            // Example:
            // const ipfsResponse = await ipfs.add(JSON.stringify(vcData));
            // setStatus(`VC stored on IPFS: ${ipfsResponse.path}`);
        } catch (error) {
            console.error("Error storing VC:", error);
            setStatus("Error storing VC");
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
            <div>
                <h3>Étape 1.1: Génération de la paire de clés et DID</h3>
                <button onClick={handleGenerateDID}>Générer le DID</button>
            </div>
            <div>
                <h3>Étape 3: Stockage sécurisé du VC</h3>
                <button onClick={handleStoreVC} disabled={!wallet}>
                    Store Encrypted VC Securely
                </button>
            </div>

            {wallet && (
                <div>
                    <h4>Clé Privée:</h4>
                    <pre>{wallet.privateKey}</pre>
                    <h4>Clé Publique:</h4>
                    <pre>{wallet.publicKey}</pre>
                </div>
            )}

            {didTransaction && (
                <div>
                    <h3>Transaction DIDSet:</h3>
                    <pre>{didTransaction}</pre>
                </div>
            )}
        </div>
    );
};

export default DIDComponent;

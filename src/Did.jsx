import React, { useState } from "react";
import { Client, Wallet } from "xrpl";

// Helper function to generate a mock key pair (for example purposes)
const generateKeyPair = () => {
    // In a real app, you'd use a proper cryptographic library to generate the keys.
    const privateKey = "7c1f15e90f6b3a25...";
    const publicKey = "02a1633cac4ab4...";
    return { privateKey, publicKey };
};

// Helper function to simulate VC creation and encryption
const encryptVC = (vc, recipientPublicKey) => {
    // Simulate encryption with recipient's public key
    // In a real app, you'd use a proper encryption library like RSA-OAEP or ECIES
    const encryptedVC = "Base64EncodedEncryptedData"; // Mock encrypted VC
    return {
        encryptedVC,
        encryptionMetadata: {
            algorithm: "RSA-OAEP", // Mock encryption algorithm
            key: recipientPublicKey,
            nonce: "RandomNonce", // Mock nonce for encryption
        },
    };
};

const DIDComponent = () => {
    const [privateKey, setPrivateKey] = useState("");
    const [publicKey, setPublicKey] = useState("");
    const [didTransaction, setDidTransaction] = useState("");
    const [status, setStatus] = useState("Not connected to XRPL");
    const [wallet, setWallet] = useState(null);
    const [client] = useState(
        new Client("wss://s.altnet.rippletest.net:51233")
    );
    const [vc, setVC] = useState(""); // State for the created VC
    const [encryptedVC, setEncryptedVC] = useState(""); // State for the encrypted VC

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

    const handleGenerateDID = () => {
        // Generate the key pair
        const { privateKey, publicKey } = generateKeyPair();
        setPrivateKey(privateKey);
        setPublicKey(publicKey);

        // Create the DID JSON document
        const didDocument = {
            "@context": "https://www.w3.org/ns/did/v1",
            id: "did:xrpl:1234abcd",
            authentication: [
                {
                    type: "Ed25519VerificationKey2020",
                    publicKey: publicKey,
                },
            ],
        };

        // Create the DIDSet transaction
        const transaction = {
            TransactionType: "DIDSet",
            Account: wallet.classicAddress, // Replace with real XRPL account
            DIDDocument: didDocument,
        };

        setDidTransaction(JSON.stringify(transaction, null, 2)); // Format the transaction for display
    };

    const handleCreateVC = () => {
        const vc = {
            id: "https://example.org/credentials/3732",
            issuer: `did:xrpl:${wallet.classicAddress}`, // Using account as issuer
            issued: new Date().toISOString(),
            credentialSubject: {
                id: `did:xrpl:${wallet.classicAddress}`, // The DID of the subject
                name: "John Doe",
                birthDate: "1990-01-01",
                nationality: "French",
            },
            proof: {
                type: "Ed25519Signature2020",
                created: new Date().toISOString(),
                proofPurpose: "assertionMethod",
                verificationMethod: `did:xrpl:${wallet.classicAddress}#key-1`,
                jws: "eyJhbGciOiJFZDI1N...SIGNATURE", // Mock JWS signature
            },
        };

        setVC(JSON.stringify(vc, null, 2)); // Display VC
    };

    const handleEncryptVC = () => {
        if (!publicKey) {
            alert("Please generate a public key first.");
            return;
        }

        // Encrypt the VC using the recipient's public key (simulated)
        const encryptedData = encryptVC(JSON.parse(vc), publicKey);
        setEncryptedVC(JSON.stringify(encryptedData, null, 2)); // Display encrypted VC
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
                <h3>Étape 1.1: Génération de la paire de clés</h3>
                <button onClick={handleGenerateDID}>
                    Générer la paire de clés et DID
                </button>
            </div>

            {privateKey && publicKey && (
                <div>
                    <h4>Clé Privée:</h4>
                    <pre>{privateKey}</pre>
                    <h4>Clé Publique:</h4>
                    <pre>{publicKey}</pre>
                </div>
            )}

            {didTransaction && (
                <div>
                    <h3>Transaction DIDSet:</h3>
                    <pre>{didTransaction}</pre>
                </div>
            )}

            <div>
                <h3>Étape 2.1: Création du Credential (VC)</h3>
                <button onClick={handleCreateVC}>Créer le Credential</button>
                {vc && (
                    <div>
                        <h4>VC (Credential) JSON:</h4>
                        <pre>{vc}</pre>
                    </div>
                )}
            </div>

            <div>
                <h3>Étape 2.2: Chiffrement du Credential</h3>
                <button onClick={handleEncryptVC}>
                    Chiffrer le Credential
                </button>
                {encryptedVC && (
                    <div>
                        <h4>VC Chiffré:</h4>
                        <pre>{encryptedVC}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DIDComponent;

import React, { useState } from "react";
import { Client, Wallet } from "xrpl";
import { pinata } from "./Pinata.jsx";
import { encrypt, decrypt, PrivateKey } from "eciesjs";
import vcTemplate from "./assets/verifiableCredential.json";
import { Buffer } from 'buffer';

if (!window.Buffer) {
    window.Buffer = Buffer;
}


// Function to sign data with the XRPL wallet
const signData = (wallet, data) => {
    try {
        // Creates a Payment transaction with the data in Memos (standard XRPL practice)
        const tx = {
            TransactionType: "Payment",
            Account: wallet.classicAddress,
            Destination: wallet.classicAddress,
            Amount: "0",
            Memos: [{
                Memo: {
                    MemoData: Buffer.from(JSON.stringify(data)).toString('hex')
                }
            }]
        };
        return wallet.sign(tx).hash; // Returns the hash of the signed transaction
    } catch (error) {
        console.error("Error during signing:", error);
        throw error;
    }
};


const DIDComponent = () => {
    // Essential states of the component
    const [didTransaction, setDidTransaction] = useState(""); // Stores the DID transaction
    const [status, setStatus] = useState("Not connected to XRPL"); // Connection status
    const [wallet, setWallet] = useState(null); // XRPL Wallet
    const [encryptionKeys, setEncryptionKeys] = useState(null); // Pair of keys for encryption
    const [verifiableCredential, setVerifiableCredential] = useState(null); // Unencrypted VC
    const [encryptedVC, setEncryptedVC] = useState(null); // Encrypted VC
    const [client] = useState(new Client("wss://s.devnet.rippletest.net:51233")); // XRPL Client
    const [birthDate, setBirthDate] = useState(null);
    const [storedCredentialSubject, setStoredCredentialSubject] = useState(null);


    // Connect to the XRPL network
    const connectClient = async () => {
        try {
            if (!client.isConnected()) {
                await client.connect();
                setStatus("Connected to XRPL Testnet");
                
                // Add a disconnect handler
                client.on('disconnected', async () => {
                    setStatus("Disconnected from XRPL. Attempting to reconnect...");
                    try {
                        await client.connect();
                        setStatus("Reconnected to XRPL Testnet");
                    } catch (error) {
                        console.error("Reconnection failed:", error);
                        setStatus("Reconnection failed");
                    }
                });
            }
        } catch (error) {
            console.error("Error connecting to XRPL:", error);
            setStatus("Error connecting to XRPL");
        }
    };

    // Connect the wallet using the private key
    const connectWallet = async () => {
        try {
            const newWallet = Wallet.fromSeed(import.meta.env.VITE_PRIVATE_KEY);
            setWallet(newWallet);
            console.log("Wallet connected");
            return newWallet;
        } catch (error) {
            console.error("Erreur de connexion wallet:", error);
            throw new Error("Échec de la connexion du wallet");
        }
    };

    // Generate encryption keys for the VC
    const generateEncryptionKeys = () => {
        try {
            const privateKey = new PrivateKey();
            const publicKey = privateKey.publicKey;
            setEncryptionKeys({ privateKey, publicKey });
            setStatus("Encryption keys generated");
            console.log("Generated keys:", {
                privateKey: privateKey.toHex(),
                publicKey: publicKey.toHex()
            });
        } catch (error) {
            console.error("Error generating keys:", error);
            setStatus("Error generating keys");
        }
    };

    // Modify the encryptVC function to only encrypt sensitive data
    const encryptVC = (vc) => {
        if (!encryptionKeys) throw new Error("Clés de chiffrement non générées");
        
        // Only encrypt the credentialSubject
        const encryptedSubject = encrypt(
            encryptionKeys.publicKey.toHex(),
            Buffer.from(JSON.stringify(vc.credentialSubject))
        ).toString('hex');

        // Return the VC with only the encrypted credentialSubject
        return {
            ...vc,
            // Replaces the credentialSubject with its encrypted version
            credentialSubject: encryptedSubject
        };
    };

    // Let's also modify the decryption function
    const decryptVC = (encryptedVC) => {
        if (!encryptionKeys) throw new Error("Clés de chiffrement non disponibles");
        
        // Decrypts the credentialSubject
        const decryptedSubject = JSON.parse(
            decrypt(
                encryptionKeys.privateKey.toHex(),
                Buffer.from(encryptedVC.credentialSubject, 'hex')
            ).toString()
        );

        // Returns the complete VC with the decrypted credentialSubject
        return {
            ...encryptedVC,
            credentialSubject: decryptedSubject
        };
    };

    // Upload the DID and VC to IPFS via Pinata
    const handlePinata = async (didDocument, encryptedVC) => {
        try {
            // Create the object in the exact desired format
            const ipfsData = {
                did: didDocument.id,
                didDocument: didDocument,
                verifiableCredential: encryptedVC,
                transaction: null, // Will be updated after the transaction
                ipfsUrl: null, // Will be updated after the upload
                gatewayUrl: null // Will be updated after the upload

            };

            const blob = new Blob([JSON.stringify(ipfsData)], { 
                type: "application/json" 
            });
            const file = new File([blob], `${Date.now()}.json`, { 
                type: "application/json" 
            });
            const result = await pinata.upload.file(file);
            
            // Update URLs in the object
            ipfsData.ipfsUrl = `ipfs://${result.IpfsHash}`;
            ipfsData.gatewayUrl = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
            
            return {
                ipfsHash: result.IpfsHash,
                ipfsData: ipfsData
            };
        } catch (error) {
            console.error("Error uploading to Pinata:", error);
            throw error;
        }
    };

    // Modification of the generateVC function
    const generateVC = async () => {
        try {
            // Automatic connections with await
            if (!client.isConnected()) {
                await connectClient();
            }

            // Ensure the wallet is connected and available
            let currentWallet = wallet;
            if (!currentWallet) {
                try {
                    // Use the returned wallet directly
                    currentWallet = await connectWallet();
                    if (!currentWallet || !currentWallet.classicAddress) {
                        throw new Error("Impossible de récupérer l'adresse du wallet");
                    }
                } catch (error) {
                    console.error("Erreur de connexion wallet:", error);
                    throw new Error("Échec de la connexion du wallet");
                }
            }

            const proofData = {
                id: `urn:uuid:${crypto.randomUUID()}`,
                type: vcTemplate.type,
            };

            // Credential signature with the verified wallet
            const vc = {
                ...vcTemplate,
                "id": proofData.id,
                "issuer": `did:xrpl:rMuwGvcUxnS1LT4xXDaVZGZGbBtrUD5bgd`,
                "credentialSubject": {
                    ...vcTemplate.credentialSubject,
                    "id": `did:xrpl:${currentWallet.classicAddress}`
                },
                "proof": {
                    "type": "XrplSignature2023",
                    "verificationMethod": `did:xrpl:${currentWallet.classicAddress}#key-1`,
                    "proofPurpose": "assertionMethod",
                    "proofValue": signData(currentWallet, proofData),
                    "signedData": proofData
                }
            };

            setVerifiableCredential(vc);
            setStatus("Verifiable Credential generated");
            return vc;
        } catch (error) {
            console.error("Error generating VC:", error);
            setStatus(`Error generating VC: ${error.message}`);
            return null;
        }
    };

    // Modify handleEncryptVC to handle the new format
    const handleEncryptVC = () => {
        if (!verifiableCredential || !encryptionKeys) {
            setStatus("Generate VC and encryption keys first");
            return;
        }

        try {
            const encrypted = encryptVC(verifiableCredential);
            setEncryptedVC(encrypted);
            setStatus("VC encrypted successfully");
            console.log("VC with encrypted credentialSubject:", encrypted);
        } catch (error) {
            console.error("Error encrypting VC:", error);
            setStatus("Error encrypting VC");
        }
    };

    // Modify handleDecryptVC to remove birth date extraction
    const handleDecryptVC = () => {
        if (!encryptedVC || !encryptionKeys) {
            setStatus("No encrypted VC available");
            return;
        }

        try {
            const decryptedVC = decryptVC(encryptedVC);
            console.log("Decrypted VC:", decryptedVC);
            setStatus("VC decrypted successfully");
        } catch (error) {
            console.error("Error decrypting VC:", error);
            setStatus("Error decrypting VC");
        }
    };

    // Modification of handleGenerateDID
    const handleGenerateDID = async () => {
        if (!encryptionKeys || !verifiableCredential) {
            setStatus("Missing prerequisites: encryption keys or credential");
            return;
        }

        try {
            // Automatic connection if necessary
            if (!client.isConnected()) {
                await connectClient();
            }
            if (!wallet) {
                connectWallet();
            }

            const didDocument = {
                "@context": ["https://www.w3.org/ns/did/v1"],
                id: `did:xrpl:${wallet.classicAddress}`,
                authentication: [{
                    id: `did:xrpl:${wallet.classicAddress}#key-1`,
                    type: "Ed25519VerificationKey2020",
                    controller: `did:xrpl:${wallet.classicAddress}`,
                    publicKeyMultibase: `z${wallet.publicKey}`
                }]
            };

            const encryptedVC = encryptVC(verifiableCredential);
            
            // Silent storage of the encrypted credentialSubject
            setStoredCredentialSubject(encryptedVC.credentialSubject);
            
            // Initial upload to IPFS
            const { ipfsHash, ipfsData } = await handlePinata(didDocument, encryptedVC);
            
            const preparedTransaction = await client.autofill({
                TransactionType: "DIDSet",
                Account: wallet.classicAddress,
                didDocument: Buffer.from(JSON.stringify(didDocument)).toString("hex"),
                URI: Buffer.from(`ipfs://${ipfsHash}`).toString("hex")
            });

            const result = await client.submitAndWait(
                wallet.sign(preparedTransaction).tx_blob
            );

            // Update the object with transaction information
            ipfsData.transaction = result;

            // Update the file on IPFS with transaction information
            const finalBlob = new Blob([JSON.stringify(ipfsData)], { 
                type: "application/json" 
            });
            const finalFile = new File([finalBlob], `${Date.now()}_final.json`, { 
                type: "application/json" 
            });
            await pinata.upload.file(finalFile);

            setDidTransaction(JSON.stringify(ipfsData, null, 2));
            console.log('Document final sur IPFS:', ipfsData);
            setStatus("DID generated successfully");
        } catch (error) {
            console.error("Error generating DID:", error);
            setStatus("Error generating DID");
        }
    };

    // Modify getBirthDate to return only a boolean
    const getBirthDate = () => {
        if (!storedCredentialSubject || !encryptionKeys) {
            setStatus("No stored credentialSubject or missing keys");
            return false;
        }

        try {
            const decryptedSubject = JSON.parse(
                decrypt(
                    encryptionKeys.privateKey.toHex(),
                    Buffer.from(storedCredentialSubject, 'hex')
                ).toString()
            );
            
            const birthDate = decryptedSubject.birthDate;
            const today = new Date();
            const birth = new Date(birthDate);
            const age = today.getFullYear() - birth.getFullYear();
            const monthDiff = today.getMonth() - birth.getMonth();
            
            // Adjustment if the birth month has not yet passed this year
            const isAdult = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()) 
                ? age - 1 >= 18 
                : age >= 18;

            setStatus(isAdult ? "Yes" : "No");
            return isAdult;
        } catch (error) {
            console.error("Error verifying age:", error);
            setStatus("Error verifying age");
            return false;
        }
    };

    // Add the nationality verification function
    const checkNationality = () => {
        if (!storedCredentialSubject || !encryptionKeys) {
            setStatus("No stored credentialSubject or missing keys");
            return false;
        }

        try {
            const decryptedSubject = JSON.parse(
                decrypt(
                    encryptionKeys.privateKey.toHex(),
                    Buffer.from(storedCredentialSubject, 'hex')
                ).toString()
            );
            
            const isFrench = decryptedSubject.nationality === "French";
            setStatus(isFrench ? "Yes" : "No");
            return isFrench;
        } catch (error) {
            console.error("Error verifying nationality:", error);
            setStatus("Error verifying nationality");
            return false;
        }
    };

    // Add verification functions for Italian and English
    const checkItalianNationality = () => {
        if (!storedCredentialSubject || !encryptionKeys) {
            setStatus("No stored credentialSubject or missing keys");
            return false;
        }

        try {
            const decryptedSubject = JSON.parse(
                decrypt(
                    encryptionKeys.privateKey.toHex(),
                    Buffer.from(storedCredentialSubject, 'hex')
                ).toString()
            );
            
            const isItalian = decryptedSubject.nationality === "Italian";
            setStatus(isItalian ? "Yes" : "No");
            return isItalian;
        } catch (error) {
            console.error("Error verifying nationality:", error);
            setStatus("Error verifying nationality");
            return false;
        }
    };

    const checkEnglishNationality = () => {
        if (!storedCredentialSubject || !encryptionKeys) {
            setStatus("No stored credentialSubject or missing keys");
            return false;
        }

        try {
            const decryptedSubject = JSON.parse(
                decrypt(
                    encryptionKeys.privateKey.toHex(),
                    Buffer.from(storedCredentialSubject, 'hex')
                ).toString()
            );
            
            const isEnglish = decryptedSubject.nationality === "English";
            setStatus(isEnglish ? "Yes" : "No");
            return isEnglish;
        } catch (error) {
            console.error("Error verifying nationality:", error);
            setStatus("Error verifying nationality");
            return false;
        }
    };

    // User Interface
    return (
        <div>
            <h1>Generate DID and Credential via XRPL</h1>
            <p>Status: {status}</p>
            
            <div>
                <h3>1. Configuration</h3>
                <button onClick={generateEncryptionKeys}>Generate Keys</button>
            </div>

            <div>
                <h3>2. Credentials</h3>
                <button onClick={async () => {
                    await generateVC();
                }}>Generate VC</button>
                <button onClick={handleEncryptVC}>Encrypt VC</button>
                <button onClick={handleDecryptVC}>Decrypt VC</button>
            </div>

            <div>
                <h3>3. DID</h3>
                <button onClick={handleGenerateDID}>Generate DID</button>
            </div>

            <div>
                <h3>4. Verification</h3>
                <button onClick={getBirthDate}>Over 18 ?</button>
                <button onClick={checkNationality}>French Nationality ?</button>
                <button onClick={checkItalianNationality}>Italian Nationality ?</button>
                <button onClick={checkEnglishNationality}>English Nationality ?</button>
            </div>

            {verifiableCredential && (
                <div>
                    <h3>Generated VC:</h3>
                    <pre>{JSON.stringify(verifiableCredential, null, 2)}</pre>
                </div>
            )}

            {encryptedVC && (
                <div>
                    <h3>Encrypted VC:</h3>
                    <pre>{JSON.stringify(encryptedVC, null, 2)}</pre>
                </div>
            )}

            {didTransaction && (
                <div>
                    <h3>DID Transaction:</h3>
                    <pre>{didTransaction}</pre>
                </div>
            )}

            {status && status !== "Not connected to XRPL" && (
                <div>
                    <h3>Verification Result:</h3>
                    <p>{status}</p>
                </div>
            )}
        </div>
    );
};

export default DIDComponent;
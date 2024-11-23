import React, { useState } from "react";
import { Client, Wallet } from "xrpl";
import { pinata } from "./Pinata.jsx";
import { encrypt, decrypt, PrivateKey } from "eciesjs";
import vcTemplate from "./assets/verifiableCredential.json";

// Fonction pour signer des données avec le wallet XRPL
const signData = (wallet, data) => {
    try {
        // Crée une transaction Payment avec les données dans Memos (pratique standard XRPL)
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
        return wallet.sign(tx).hash; // Retourne le hash de la transaction signée
    } catch (error) {
        console.error("Erreur lors de la signature:", error);
        throw error;
    }
};

const DIDComponent = () => {
    // États essentiels du composant
    const [didTransaction, setDidTransaction] = useState(""); // Stocke la transaction DID
    const [status, setStatus] = useState("Not connected to XRPL"); // État de la connexion
    const [wallet, setWallet] = useState(null); // Wallet XRPL
    const [encryptionKeys, setEncryptionKeys] = useState(null); // Paire de clés pour le chiffrement
    const [verifiableCredential, setVerifiableCredential] = useState(null); // VC non chiffré
    const [encryptedVC, setEncryptedVC] = useState(null); // VC chiffré
    const [client] = useState(new Client("wss://s.devnet.rippletest.net:51233")); // Client XRPL
    const [birthDate, setBirthDate] = useState(null);
    const [storedCredentialSubject, setStoredCredentialSubject] = useState(null);

    // Connexion au réseau XRPL
    const connectClient = async () => {
        try {
            if (!client.isConnected()) {
                await client.connect();
                setStatus("Connected to XRPL Testnet");
                
                // Ajout d'un gestionnaire de déconnexion
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

    // Connexion du wallet depuis la clé privée
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

    // Génération des clés de chiffrement pour le VC
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

    // Modifions la fonction encryptVC pour ne chiffrer que les données sensibles
    const encryptVC = (vc) => {
        if (!encryptionKeys) throw new Error("Clés de chiffrement non générées");
        
        // On ne chiffre que le credentialSubject
        const encryptedSubject = encrypt(
            encryptionKeys.publicKey.toHex(),
            Buffer.from(JSON.stringify(vc.credentialSubject))
        ).toString('hex');

        // On retourne le VC avec seulement le credentialSubject chiffré
        return {
            ...vc,
            credentialSubject: encryptedSubject // Remplace le credentialSubject par sa version chiffrée
        };
    };

    // Modifions aussi la fonction de déchiffrement
    const decryptVC = (encryptedVC) => {
        if (!encryptionKeys) throw new Error("Clés de chiffrement non disponibles");
        
        // Déchiffre le credentialSubject
        const decryptedSubject = JSON.parse(
            decrypt(
                encryptionKeys.privateKey.toHex(),
                Buffer.from(encryptedVC.credentialSubject, 'hex')
            ).toString()
        );

        // Retourne le VC complet avec le credentialSubject déchiffré
        return {
            ...encryptedVC,
            credentialSubject: decryptedSubject
        };
    };

    // Upload du DID et VC sur IPFS via Pinata
    const handlePinata = async (didDocument, encryptedVC) => {
        try {
            // Création de l'objet dans le format exact souhaité
            const ipfsData = {
                did: didDocument.id,
                didDocument: didDocument,
                verifiableCredential: encryptedVC,
                transaction: null, // Sera mis à jour après la transaction
                ipfsUrl: null, // Sera mis à jour après l'upload
                gatewayUrl: null // Sera mis à jour après l'upload
            };

            const blob = new Blob([JSON.stringify(ipfsData)], { 
                type: "application/json" 
            });
            const file = new File([blob], `${Date.now()}.json`, { 
                type: "application/json" 
            });
            const result = await pinata.upload.file(file);
            
            // Mise à jour des URLs dans l'objet
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

    // Modification de la fonction generateVC
    const generateVC = async () => {
        try {
            // Connexions automatiques avec await
            if (!client.isConnected()) {
                await connectClient();
            }

            // S'assurer que le wallet est connecté et disponible
            let currentWallet = wallet;
            if (!currentWallet) {
                try {
                    currentWallet = await connectWallet(); // Utiliser directement le wallet retourné
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

            // Credential signature avec le wallet vérifié
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

    // Modifions handleEncryptVC pour gérer le nouveau format
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

    // Modification de handleDecryptVC pour enlever l'extraction de la date de naissance
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

    // Modification de handleGenerateDID
    const handleGenerateDID = async () => {
        if (!encryptionKeys || !verifiableCredential) {
            setStatus("Missing prerequisites: encryption keys or credential");
            return;
        }

        try {
            // Connexion automatique si nécessaire
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
            
            // Stockage silencieux du credentialSubject chiffré
            setStoredCredentialSubject(encryptedVC.credentialSubject);
            
            // Upload initial vers IPFS
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

            // Mise à jour de l'objet avec les informations de transaction
            ipfsData.transaction = result;

            // Mise à jour du fichier sur IPFS avec les informations de transaction
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

    // Modification de getBirthDate pour ne retourner qu'un booléen
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
            
            // Ajustement si le mois de naissance n'est pas encore passé cette année
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

    // Ajout de la fonction de vérification de la nationalité
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

    // Ajout des fonctions de vérification pour Italien et Anglais
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

    // Interface utilisateur
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
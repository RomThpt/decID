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
    const connectWallet = () => {
        setWallet(Wallet.fromSeed(import.meta.env.VITE_PRIVATE_KEY));
        setStatus("Wallet connected");
    };

    // Génération des clés de chiffrement pour le VC
    const generateEncryptionKeys = () => {
        try {
            const privateKey = new PrivateKey();
            const publicKey = privateKey.publicKey;
            setEncryptionKeys({ privateKey, publicKey });
            setStatus("Clés de chiffrement générées");
            console.log("Clés générées:", {
                privateKey: privateKey.toHex(),
                publicKey: publicKey.toHex()
            });
        } catch (error) {
            console.error("Erreur lors de la génération des clés:", error);
            setStatus("Erreur lors de la génération des clés");
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

    // Génération du Verifiable Credential
    const generateVC = () => {
        if (!wallet) {
            setStatus("Wallet non connecté");
            return;
        }

        try {
            const proofData = {
                id: `urn:uuid:${crypto.randomUUID()}`,
                type: vcTemplate.type,
            };

            //Credential signature
            const vc = {
                ...vcTemplate,
                "id": proofData.id,
                "issuer": `did:xrpl:rMuwGvcUxnS1LT4xXDaVZGZGbBtrUD5bgd`,
                "credentialSubject": {
                    ...vcTemplate.credentialSubject,
                    "id": `did:xrpl:${wallet.classicAddress}`
                },
                "proof": {
                    "type": "XrplSignature2023",
                    "verificationMethod": `did:xrpl:${wallet.classicAddress}#key-1`,
                    "proofPurpose": "assertionMethod",
                    "proofValue": signData(wallet, proofData),
                    "signedData": proofData
                }
            };

            setVerifiableCredential(vc);
            setStatus("Verifiable Credential généré");
            return vc;
        } catch (error) {
            console.error("Erreur génération VC:", error);
            setStatus("Erreur génération VC");
            return null;
        }
    };

    // Modifions handleEncryptVC pour gérer le nouveau format
    const handleEncryptVC = () => {
        if (!verifiableCredential || !encryptionKeys) {
            setStatus("Générez d'abord le VC et les clés de chiffrement");
            return;
        }

        try {
            const encrypted = encryptVC(verifiableCredential);
            setEncryptedVC(encrypted);
            setStatus("VC chiffré avec succès");
            console.log("VC avec credentialSubject chiffré:", encrypted);
        } catch (error) {
            console.error("Erreur lors du chiffrement du VC:", error);
            setStatus("Erreur lors du chiffrement du VC");
        }
    };

    // Modification de handleDecryptVC pour enlever l'extraction de la date de naissance
    const handleDecryptVC = () => {
        if (!encryptedVC || !encryptionKeys) {
            setStatus("Pas de VC chiffré disponible");
            return;
        }

        try {
            const decryptedVC = decryptVC(encryptedVC);
            console.log("VC déchiffré:", decryptedVC);
            setStatus("VC déchiffré avec succès");
        } catch (error) {
            console.error("Erreur lors du déchiffrement du VC:", error);
            setStatus("Erreur lors du déchiffrement du VC");
        }
    };

    // Modification de handleGenerateDID
    const handleGenerateDID = async () => {
        if (!client.isConnected() || !wallet || !encryptionKeys || !verifiableCredential) {
            setStatus("Prérequis manquants");
            return;
        }

        try {
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
            setStatus("DID généré avec succès");
        } catch (error) {
            console.error("Erreur génération DID:", error);
            setStatus("Erreur génération DID");
        }
    };

    // Modification de getBirthDate pour utiliser le credentialSubject stocké
    const getBirthDate = () => {
        if (!storedCredentialSubject || !encryptionKeys) {
            setStatus("Pas de credentialSubject stocké ou clés manquantes");
            return;
        }

        try {
            const decryptedSubject = JSON.parse(
                decrypt(
                    encryptionKeys.privateKey.toHex(),
                    Buffer.from(storedCredentialSubject, 'hex')
                ).toString()
            );
            
            const birthDate = decryptedSubject.birthDate;
            setBirthDate(birthDate);
            console.log("Date de naissance récupérée:", birthDate);
            setStatus("Date de naissance récupérée avec succès");
        } catch (error) {
            console.error("Erreur lors de la récupération de la date de naissance:", error);
            setStatus("Erreur lors de la récupération de la date de naissance");
        }
    };

    // Interface utilisateur
    return (
        <div>
            <h1>Générer un DID et un Credential via XRPL</h1>
            <p>Status: {status}</p>
            
            <div>
                <h3>1. Configuration</h3>
                <button onClick={connectClient}>Connect XRPL</button>
                <button onClick={connectWallet}>Connect Wallet</button>
                <button onClick={generateEncryptionKeys}>Générer clés</button>
            </div>

            <div>
                <h3>2. Credentials</h3>
                <button onClick={generateVC}>Générer VC</button>
                <button onClick={handleEncryptVC}>Chiffrer VC</button>
                <button onClick={handleDecryptVC}>Déchiffrer VC</button>
            </div>

            <div>
                <h3>3. DID</h3>
                <button onClick={handleGenerateDID}>Générer DID</button>
            </div>

            <div>
                <h3>4. Données sensibles</h3>
                <button onClick={getBirthDate}>Récupérer la date de naissance</button>
            </div>

            {verifiableCredential && (
                <div>
                    <h3>VC généré:</h3>
                    <pre>{JSON.stringify(verifiableCredential, null, 2)}</pre>
                </div>
            )}

            {encryptedVC && (
                <div>
                    <h3>VC Chiffré:</h3>
                    <pre>{JSON.stringify(encryptedVC, null, 2)}</pre>
                </div>
            )}

            {didTransaction && (
                <div>
                    <h3>Transaction DID:</h3>
                    <pre>{didTransaction}</pre>
                </div>
            )}

            {birthDate && (
                <div>
                    <h3>Date de naissance récupérée:</h3>
                    <p>{birthDate}</p>
                </div>
            )}
        </div>
    );
};

export default DIDComponent;
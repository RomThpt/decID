import React, { useState, useEffect } from 'react';
import * as xrpl from 'xrpl';
import { useNavigate } from 'react-router-dom';
import './WalletConnection.css';

const WalletConnection = ({ onWalletConnected }) => {
    const [walletConnected, setWalletConnected] = useState(false); // Connection state
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // Disable scrolling while on this page
        document.body.classList.add('no-scroll');

        // Re-enable scrolling when the component is unmounted
        return () => {
            document.body.classList.remove('no-scroll');
        };
    }, []);

    const connectWallet = async () => {
        try {
            // Load the private key from environment variables
            const privateKey = import.meta.env.VITE_PRIVATE_KEY;

            // Initialize an XRPL wallet with the private key
            const wallet = xrpl.Wallet.fromSeed(privateKey);
            console.log('Wallet generated:', wallet);

            // Connect to the XRPL network
            const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233'); // Testnet
            await client.connect();

            // Fetch account balance
            const accountInfo = await client.request({
                command: 'account_info',
                account: wallet.address,
                ledger_index: 'validated',
            });

            console.log(
                'Wallet connected:',
                wallet.address,
                'Balance:',
                accountInfo.result.account_data.Balance
            );

            // Disconnect the XRPL client after the request
            await client.disconnect();

            // Trigger the connected state
            setWalletConnected(true);

            // Notify the parent component that the wallet is connected
            if (onWalletConnected) {
                onWalletConnected();
            }
        } catch (err) {
            console.error('Error connecting wallet:', err);
            setError(err.message || 'Failed to connect wallet.');
        }
    };

    return (
        <div className="wallet-container">
            <h1 className="wallet-title">Connect your XRPL wallet</h1>
            {!walletConnected ? (
                <>
                    <p className="wallet-subtitle">To continue, please connect your wallet.</p>
                    <button className="wallet-button" onClick={connectWallet}>
                        Connect Wallet
                    </button>
                    {error && <p className="wallet-status error">{error}</p>}
                </>
            ) : (
                <p className="wallet-status success">Wallet successfully connected!</p>
            )}
        </div>
    );
};

export default WalletConnection;

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Home from './components/Home/Home';
import Credentials from './components/Credentials/Credentials';
import DIDCreation from './components/DIDCreation/DIDCreation';
import Navbar from './components/Navbar/Navbar';
import WalletConnection from './components/WalletConnection/WalletConnection';
import Profile from './components/Profile/Profile';
import './App.css';
import logo from './assets/logo.png';
import { useLocation } from 'react-router-dom';
import ErrorPage from './components/ErrorPage/ErrorPage';

const App = () => {
    // State to track if the wallet is connected
    const [isWalletConnected, setIsWalletConnected] = useState(false);

    // Function to handle wallet connection
    const handleWalletConnected = () => {
        setIsWalletConnected(true);
    };

    // Function to handle user logout
    const handleLogout = () => {
        setIsWalletConnected(false);
    };

    return (
        <Router>
            <div>
                {/* Header component with dynamic button */}
                <Header
                    isWalletConnected={isWalletConnected}
                    onLogout={handleLogout}
                />
                {/* Show Navbar only when the wallet is connected */}
                {isWalletConnected && <Navbar />}
                <Routes>
                    {/* Route for the Home page */}
                    <Route path="/" element={<Home />} />
                    {/* Route for wallet connection page */}
                    <Route
                        path="/wallet-connection"
                        element={
                            isWalletConnected ? (
                                <Navigate to="/did-creation" />
                            ) : (
                                <WalletConnection onWalletConnected={handleWalletConnected} />
                            )
                        }
                    />
                    {/* Route for DID creation */}
                    <Route
                        path="/did-creation"
                        element={
                            isWalletConnected ? (
                                <DIDCreation />
                            ) : (
                                <Navigate to="/wallet-connection" />
                            )
                        }
                    />
                    {/* Route for profile page */}
                    <Route
                        path="/profile"
                        element={
                            isWalletConnected ? (
                                <Profile />
                            ) : (
                                <Navigate to="/wallet-connection" /> // Redirect to wallet connection if not connected
                            )
                        }
                    />
                    {/* Route for credentials page */}
                    <Route
                        path="/credentials"
                        element={
                            isWalletConnected ? (
                                <Credentials />
                            ) : (
                                <Navigate to="/wallet-connection" /> // Redirect to wallet connection if not connected
                            )
                        }
                    />
                    {/* Fallback route for undefined paths */}
                    <Route path="*" element={<ErrorPage />} />
                </Routes>
            </div>
        </Router>
    );
};

// Header component
const Header = ({ isWalletConnected, onLogout }) => {
    const navigate = useNavigate(); // Hook for programmatic navigation
    const location = useLocation(); // Get current location

    // Navigate to the home page when the logo is clicked
    const handleLogoClick = () => {
        navigate('/');
    };

    // Navigate to the wallet connection page
    const handleLoginClick = () => {
        navigate('/wallet-connection');
    };

    // Handle logout and navigate back to home
    const handleLogoutClick = () => {
        onLogout();
        navigate('/');
    };

    // Determine if the user is currently on the wallet connection page
    const isOnWalletConnectionPage = location.pathname === '/wallet-connection';

    return (
        <header className="header">
            {/* Display the logo, clickable to navigate to home */}
            <img src={logo} alt="Logo" className="logo" onClick={handleLogoClick} />
            <div>
                {/* Show "Log In" button if not connected and not on the wallet connection page */}
                {!isWalletConnected && !isOnWalletConnectionPage ? (
                    <button className="login-button-global" onClick={handleLoginClick}>
                        Log In
                    </button>
                ) : isWalletConnected ? (
                    // Show "Log Out" button if connected
                    <button className="logout-button-global" onClick={handleLogoutClick}>
                        Log Out
                    </button>
                ) : null}
            </div>
        </header>
    );
};

export default App;
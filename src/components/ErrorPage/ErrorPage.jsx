import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ErrorPage.css';

const ErrorPage = () => {
    const navigate = useNavigate();

    const handleGoBack = () => {
        navigate('/'); // Redirects to the homepage
    };

    return (
        <div className="error-page">
            <h1>404</h1>
            <p>Oops! The page you're looking for doesn't exist.</p>
            <button className="go-back-button" onClick={handleGoBack}>
                Go Back Home
            </button>
        </div>
    );
};

export default ErrorPage;

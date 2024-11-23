import React, { useEffect } from 'react';
import './Home.css';

const Home = () => {
    useEffect(() => {
        // Disable scrolling when this page is active
        document.body.classList.add('no-scroll');

        // Cleanup when the component is unmounted
        return () => {
            document.body.classList.remove('no-scroll');
        };
    }, []);

    return (
        <div className="home-container">
            <h1>
                Welcome to dec
                <span className="highlight-id">ID</span>!
            </h1>
            <p>WHERE IDENTITY IS TRULY YOURS.</p>
        </div>
    );
};

export default Home;

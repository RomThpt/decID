import React from 'react';
import '../../App.css';

const Profile = () => {
  return (
    <div className="app-container">
      <div>
        <h1 className="app-title">Welcome, Romain!</h1>
        <p className="app-description">
          Protecting your identity and deciding what to share are key to safeguarding your privacy.
        </p>
        <p className="app-description">Which proof do you want to generate?</p>
      </div>

      <div className="app-categories" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
        <div className="category">
          <h2 className="category-title">Age proof</h2>
          <div className="category-buttons">
            <button className="app-button">+18 years</button>
            <button className="app-button">+21 years</button>
            <button className="app-button">-25 years</button>
            <button className="app-button">+80 years</button>
          </div>
        </div>

        <div className="category">
          <h2 className="category-title">Nationality</h2>
          <div className="category-buttons">
            <button className="app-button">French</button>
            <button className="app-button">Italian</button>
            <button className="app-button">English</button>
          </div>
        </div>

        <div className="category">
          <h2 className="category-title">Driving</h2>
          <div className="category-buttons">
            <button className="app-button">Driver's licence</button>
          </div>
        </div>

        <div className="category">
          <h2 className="category-title">Card</h2>
          <div className="category-buttons">
            <button className="app-button">Student Card</button>
            <button className="app-button">Transport Card</button>
          </div>
        </div>
      </div>

      <p className="app-descri">
        With decID, your identity is secure and under your control. By leveraging the power of Decentralized Identifiers (DIDs), decID ensures that your personal information is protected and only shared on your terms.

        DIDs provide a modern, privacy-focused approach to identity management, allowing you to verify your credentials without exposing unnecessary details. Whether proving your age, nationality, or any other aspect of your identity, decID keeps your data private, tamper-proof, and easily accessible when needed.

        Take control of your digital presence and trust decID to safeguard your identity in an ever-evolving digital world.
      </p>
    </div>
  );
};

export default Profile;

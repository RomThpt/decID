import React from 'react';
import DIDComponent from '../../Did';
import './DIDCreation.css';

const DIDCreation = () => {
  return (
    <div className="app-container">
      <h1 className="app-title">Create your Digital Identity</h1>
      <div className="category">
        <div className="did-content">
          <DIDComponent />
        </div>
      </div>
      <p className="app-descri">
        Create your Decentralized Identity (DID) on the XRP Ledger. This digital identity will allow you to securely store and share your credentials while maintaining full control over your personal information.
      </p>
    </div>
  );
};

export default DIDCreation; 
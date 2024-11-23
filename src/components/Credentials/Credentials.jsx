import React from 'react';
import '../../App.css';

const Credentials = () => {
  const generateWeb3Address = () => {
    return '0x' + Math.floor(Math.random() * 1e16).toString(16).padStart(16, '0');
  };

  const firstName = "Romain";
  const lastName = "Ropied";
  const dateOfBirth = "06/04/2004";
  const nationality = "French"

  return (
    <div className="app-container">
      
      <h1 className="app-title">My credentials</h1>
      <div className="app-categories" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
        <div className="category">
          <h2 className="category-title">Identity Card</h2>
          <p>Issuer Address: 0x3F5CE5FBFe3E9af3971dD833D26BA9b5C936F0bE</p>
          <p>First Name: {firstName}</p>
          <p>Last Name: {lastName}</p>
          <p>Date of Birth: {dateOfBirth}</p>
          <p>Expiration Date: 28/01/2032</p>
          <p>ID Number: 127453989</p>
          <p>Nationality: {nationality}</p>
        </div>

        <div className="category">
          <h2 className="category-title">Student Card</h2>
          <p>First Name: {firstName}</p>
          <p>Last Name: {lastName}</p>
          <p>School: ESILV</p>
          <p>Student ID: 947395768317234</p>
        </div>

        <div className="category">
          <h2 className="category-title">Transport Card</h2>
          <p>First Name: {firstName}</p>
          <p>Last Name: {lastName}</p>
          <p>Subscription Status: Active</p>
          <p>Expiration Date: 12/31/2023</p>
          <p> Card ID: A3H567J8K3</p>
        </div>

        <div className="category">
          <h2 className="category-title">Driver License</h2>
          <p>First Name: {firstName}</p>
          <p>Last Name: {lastName}</p>
          <p>Date of Birth: {dateOfBirth}</p>
          <p>Date of Obtention: 07/18/2020</p>
          <p>Expiration Date: 07/18/2035</p>
          <p>License Number: DL123456789</p>
          <p>License Category: B</p>
          <p>Nationality: {nationality}</p>
        </div>

        

      </div>
    </div>
  );
};

export default Credentials;
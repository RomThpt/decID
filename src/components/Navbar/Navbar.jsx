// Fichier : src/components/Navbar/Navbar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';  // Assurez-vous que votre CSS est correctement lié

const Navbar = () => {
  // Cette fonction renvoie des noms de classe conditionnels pour le NavLink
  const setActive = ({ isActive }) => isActive ? "nav-link active" : "nav-link";

  return (
    <nav className="navbar">
      <ul className="navbar-nav">
        <li className="nav-item">
          <NavLink to="/" className={setActive}>Home</NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/Credentials" className={setActive}>Credentials</NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
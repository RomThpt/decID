import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ onLogout }) => {
  const setActive = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

  return (
    <nav className="navbar">
      <ul className="navbar-nav">
        <li className="nav-item">
          <NavLink to="/did-creation" className={setActive}>
            Create DID
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/profile" className={setActive}>
            Profile
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/credentials" className={setActive}>
            Credentials
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;

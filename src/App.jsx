// Fichier : src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './components/Home/Home';
import About from './components/Credentials/Credentials';
import Navbar from './components/Navbar/Navbar';
import Credentials from './components/Credentials/Credentials';
import DIDSetTransaction from './components/Did/Did';

const App = () => {
    return (
      <Router>
        <div>
          <DIDSetTransaction />
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/credentials" element={<Credentials />} />
          </Routes>
        </div>
      </Router>
    );
  };
export default App;
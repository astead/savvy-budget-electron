// header.js

import React from 'react';
import { Link } from 'react-router-dom';

export const Header = ({currTab}) => {
  return (
    <div className="NavBar">
      <Link to="/" className={currTab === "Home"?"menuLink-selected":"menuLink"}>Home</Link>
      <Link to="/Charts/-2" className={currTab === "Charts"?"menuLink-selected":"menuLink"}>Charts</Link>
      <Link to="/Transactions" className={currTab === "Transactions"?"menuLink-selected":"menuLink"}>Transactions</Link>
      <Link to="/Envelopes" className={currTab === "Envelopes"?"menuLink-selected":"menuLink"}>Envelopes</Link>
      <Link to="/Configure" className={currTab === "Configure"?"menuLink-selected":"menuLink"}>Configure</Link>
    </div>
  );
};

export default Header;
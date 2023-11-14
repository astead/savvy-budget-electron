// header.js

import React from 'react';
import { Link } from 'react-router-dom';

function Header() {
    return (
      <div>
        <Link to="/">Home</Link>
        <Link to="/envelopes">Envelopes</Link>
        <Link to="/transactions">Transactions</Link>
        <Link to="/charts">Charts</Link>
        <Link to="/configure">Configure</Link>
        <Link to="/contact">Contact</Link>
      </div>
  );
}

export default Header;
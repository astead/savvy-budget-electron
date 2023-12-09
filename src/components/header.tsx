// header.js

import React from 'react';
import { Link } from 'react-router-dom';

export const Header: React.FC = () => {
  return (
    <div className="NavBar">
      <Link to="/">Home</Link>
      <Link to="/Envelopes">Envelopes</Link>
      <Link to="/Configure">Configure</Link>
    </div>
  );
};

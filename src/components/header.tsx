// header.js

import React from 'react';
import { Link } from 'react-router-dom';

export const Header: React.FC = () => {
  return (
    <div>
      <Link to="/">Home</Link>
      <Link to="/configure">Configure</Link>
    </div>
  );
};

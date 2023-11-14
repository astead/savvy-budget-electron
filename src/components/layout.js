// Layout.js

import React from 'react';
import Header from './header.js';

function Layout({ children }) {
  return (
    <div className="App">
        <header className="App-header">
            <Header />
        </header>
        <br />
        <main>{children}</main>
    </div>
  );
}

export default Layout;
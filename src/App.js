// App.js

import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './includes/styles.css';
import Layout from './components/layout.js';
import HomePage from './components/homePage.js';
import Envelopes from './components/envelopes.js';
import Transactions from './components/transactions.js';
import Charts from './components/charts.js';
import Configure from './components/configure.js';
import ContactPage from './components/contactPage.js';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/envelopes" element={<Layout><Envelopes /></Layout>} />
        <Route path="/transactions" element={<Layout><Transactions /></Layout>} />
        <Route path="/charts" element={<Layout><Charts /></Layout>} />
        <Route path="/configure" element={<Layout><Configure /></Layout>} />
        <Route path="/contact" element={<Layout><ContactPage /></Layout>} />
      </Routes>
    </Router>
  );
}

export default App;

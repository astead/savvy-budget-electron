import React from 'react';
import ReactDOM from 'react-dom/client';
import './includes/styles.css';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { HomePage } from './components/homePage.tsx';
import { Charts } from './components/Charts.tsx';
import { Transactions } from './components/Transactions.tsx';
import { Envelopes } from './components/Envelopes.tsx';
import { Configure } from './components/Configure.tsx';

/*
  TODO:
  - Add chart page
  - Improve CRUD reposting
  - top menu bread crumbs
*/

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/Charts" element={<Charts />} />
        <Route path="/Transactions" element={<Transactions />} />
        <Route path="/Envelopes" element={<Envelopes />} />
        <Route path="/Configure" element={<Configure />} />
      </Routes>
    </Router>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

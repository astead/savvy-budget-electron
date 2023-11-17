import React from 'react';
import ReactDOM from 'react-dom/client';
import './includes/styles.css';
//import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { HomePage } from './components/homePage.tsx';
import { Configure } from './components/configure.tsx';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    {/*<App />*/}    
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/configure" element={<Configure />} />
      </Routes>
    </Router>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

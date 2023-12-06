// App.js

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './includes/styles.css';
import { HomePage } from './components/homePage.tsx';
import { Configure } from './components/configure.tsx';


export const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/configure" element={<Configure />} />
      </Routes>
    </Router>
  );
};

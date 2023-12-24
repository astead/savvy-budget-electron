import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './includes/styles.css';
import { channels } from './shared/constants.js';
import { HomePage } from './components/homePage.tsx';
import { Charts } from './components/Charts.tsx';
import { Transactions } from './components/Transactions.tsx';
import { Envelopes } from './components/Envelopes.tsx';
import { Configure } from './components/Configure.tsx';


export const App: React.FC = () => {
  // Database filename
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    if (!loaded) {

      const databaseFile_str = localStorage.getItem('databaseFile');
      if (databaseFile_str?.length) {
        const my_databaseFile = JSON.parse(databaseFile_str);
        if (my_databaseFile) {
          // Check if the database exists
          const ipcRenderer = (window as any).ipcRenderer;
          const fs = ipcRenderer.require('fs')
          
          if (fs.existsSync(my_databaseFile)) {
            const ipcRenderer = (window as any).ipcRenderer;
            ipcRenderer.send(channels.SET_DB_PATH, my_databaseFile);
          }
        }
      }

      setLoaded(true);
    }
  }, []);

  return (

    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/Charts/:envID" element={<Charts />} />
        <Route path="/Transactions/:in_envID/:in_year/:in_month" element={<Transactions />} />
        <Route path="/Envelopes" element={<Envelopes />} />
        <Route path="/Configure" element={<Configure />} />
      </Routes>
    </Router>
  );
};
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import './includes/styles.css';
import { channels } from './shared/constants.js';
import { HomePage } from './components/homePage.tsx';
import { Charts } from './components/Charts.tsx';
import { Transactions } from './components/Transactions.tsx';
import { Envelopes } from './components/Envelopes.tsx';
import { Configure } from './components/Configure.tsx';


export const App: React.FC = () => {


  const [databaseFile, setDatabaseFile] = useState('');
  const [credentials, setCredentials] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [clientID, setClientID] = useState('');
  const [secret, setSecret] = useState('');
  const [dBType, setdBType] = useState('');
  const [doneLoading, setDoneLoading] = useState(false);
  const [doneLoadingDB, setDoneLoadingDB] = useState(false);

  const check_database_file = (my_databaseFile) => {
    //console.log("Checking DB file: ", my_databaseFile);
    if (my_databaseFile?.length) {

      // Check if the database exists
      const ipcRenderer = (window as any).ipcRenderer;
      const fs = ipcRenderer.require('fs')
      
      if (fs.existsSync(my_databaseFile)) {
        console.log("calling SET_DB_PATH from check_database_file");
        const ipcRenderer = (window as any).ipcRenderer;
        ipcRenderer.send(channels.SET_DB_PATH, { DBPath: my_databaseFile });
        setDoneLoadingDB(true);
     }
    }
  };
  
  const handleGetFile = async () => {
    if (client) {
        const ipcRenderer = (window as any).ipcRenderer;
        ipcRenderer.send(channels.DRIVE_GET_FILE, { credentials: credentials, tokens: client });
        
        // Receive the data
        ipcRenderer.on(channels.DRIVE_DONE_GET_FILE, ({fileName, error}) => {
          if (fileName) {
            //console.log("We got the file: ", fileName);
            localStorage.setItem('databaseFile', JSON.stringify(fileName));
    
            check_database_file(fileName);
            localStorage.removeItem('DatabaseError');
          }
          if (error) {
            console.log("Error getting the file: " + error);
            if (error.startsWith('Lock file already exists')) {
              localStorage.setItem('LockFileExists', JSON.stringify(true));
            } else {
              localStorage.setItem('LockFileExists', JSON.stringify(false));
            }
            localStorage.setItem('DatabaseError', JSON.stringify(error));
          }

          ipcRenderer.removeAllListeners(channels.DRIVE_DONE_GET_FILE);
        });

        // Clean the listener after the component is dismounted
        return () => {
          ipcRenderer.removeAllListeners(channels.DRIVE_DONE_GET_FILE);
        };
    }
  };

  useEffect(() => {
    console.log("useEffect [databaseFile, clientID, secret, credentials, client, dBType, doneLoading, doneLoadingDB] ENTER");
    console.log("databaseFile :" + databaseFile);
    console.log("clientID :" + clientID);
    console.log("secret :" + secret);
    console.log("credentials :" + credentials);
    console.log("client :" + client);
    console.log("dBType :" + dBType);
    console.log("doneLoading :" + doneLoading);
    console.log("doneLoadingDB :" + doneLoadingDB);

    if (doneLoading && !doneLoadingDB) {
      if (dBType === 'drive') {
        if (clientID && secret && credentials && client) {
          handleGetFile();
        }
      } else {
        const ipcRenderer = (window as any).ipcRenderer;
            
        if (dBType === 'local') {
          if (databaseFile) {
            const fs = ipcRenderer.require('fs')
            
            if (fs.existsSync(databaseFile)) {
              console.log("calling SET_DB_PATH from App useEffect [databaseFile, clientID, secret, credentials, client, dBType, doneLoading, doneLoadingDB]");
              ipcRenderer.send(channels.SET_DB_PATH, { DBPath: databaseFile });
              setDoneLoadingDB(true);
            }
          }
        } else {
          if (dBType === 'cloud') {
            console.log("calling SET_DB_PATH from App useEffect [databaseFile, clientID, secret, credentials, client, dBType, doneLoading, doneLoadingDB]");
            ipcRenderer.send(channels.SET_DB_PATH, { DBPath: 'cloud' });
            setDoneLoadingDB(true);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databaseFile, clientID, secret, credentials, client, dBType, doneLoading, doneLoadingDB]);

  useEffect(() => {
    
    const databaseFile_str = localStorage.getItem('databaseFile');
    if (databaseFile_str?.length) {
      const my_databaseFile = JSON.parse(databaseFile_str);
      if (my_databaseFile) {
        setDatabaseFile(my_databaseFile);
      }
    }

    const drive_info_str = localStorage.getItem('drive-info');
    if (drive_info_str?.length) {
      const drive_info = JSON.parse(drive_info_str);
      if (drive_info) {
        setClientID(drive_info.clientID);
        setSecret(drive_info.secret);
        setCredentials(drive_info.creds);
      }
    }

    const drive_client_str = localStorage.getItem('drive-client');
    if (drive_client_str?.length) {
      const drive_client = JSON.parse(drive_client_str);
      if (drive_client) {
        setClient(drive_client.client);
      }
    }
    
    const using_DB_str = localStorage.getItem('DB-Type');
    if (using_DB_str?.length) {
      const using_DB = JSON.parse(using_DB_str);
      if (using_DB) {
        setdBType(using_DB.DBType);
      }
    }

    setDoneLoading(true);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/Charts/:in_envID" element={<Charts />} />
        <Route path="/Transactions/:in_catID/:in_envID/:in_force_date/:in_year/:in_month" element={<Transactions />} />
        <Route path="/Envelopes" element={<Envelopes />} />
        <Route path="/Configure" element={<Configure />} />
      </Routes>
    </Router>
  );
};
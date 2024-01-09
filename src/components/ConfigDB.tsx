import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEyeSlash } from "@fortawesome/free-solid-svg-icons"
import Moment from 'moment';
import EditableAccount from '../helpers/EditableAccount.tsx';
import { channels } from '../shared/constants.js';

export const ConfigDB = () => {


  // Database filename
  const [databaseFile, setDatabaseFile] = useState('');
  const [databaseExists, setDatabaseExists] = useState(false);
  const [databaseVersion, setDatabaseVersion] = useState('');
 
  const check_database_file = (my_databaseFile) => {
    //console.log("Checking DB file: ", my_databaseFile);
    if (my_databaseFile?.length) {
      // Check if the database exists
      const ipcRenderer = (window as any).ipcRenderer;
      const fs = ipcRenderer.require('fs')
      
      if (fs.existsSync(my_databaseFile)) {
        //console.log("file exists");
        setDatabaseFile(my_databaseFile);
        setDatabaseExists(true);

        // Save this in local storage
        localStorage.setItem('databaseFile', JSON.stringify(my_databaseFile));
        const ipcRenderer = (window as any).ipcRenderer;
        ipcRenderer.send(channels.SET_DB_PATH, my_databaseFile);

        get_db_version();
      } else {
        //console.log("file does not exist");
        setDatabaseExists(false);
        setDatabaseVersion('');
      }
    }
  }

  const get_db_version = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_DB_VER);

    // Receive the data
    ipcRenderer.on(channels.LIST_DB_VER, (arg) => {
      if (arg?.length > 0) {
        setDatabaseVersion(arg[0].version);
      } else {
        setDatabaseVersion('');
      }

      ipcRenderer.removeAllListeners(channels.LIST_DB_VER);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_DB_VER);
    };
  }

  useEffect(() => {const databaseFile_str = localStorage.getItem('databaseFile');
    if (databaseFile_str?.length) {
      const my_databaseFile = JSON.parse(databaseFile_str);
      if (my_databaseFile) {
        // Check if the database exists
        const ipcRenderer = (window as any).ipcRenderer;
        const fs = ipcRenderer.require('fs')
        
        if (fs.existsSync(my_databaseFile)) {
          setDatabaseFile(my_databaseFile);
          setDatabaseExists(true);
          get_db_version();
        }
      }
    }
  }, []);

  return (
    <>
    {databaseFile &&
      <span>Database: {databaseFile}</span>
    }
    {databaseFile && !databaseExists &&
      <>
        <br/>
        <span>The database file does not exist.</span>
      </>
    }
    {databaseFile && databaseExists && !databaseVersion &&
      <>
        <br/>
        <span>Database appears to be corrupted</span><br/>
      </>
    }
    {databaseFile && databaseExists && databaseVersion &&
      <>
        <br/>
        <span>Database version: {databaseVersion}</span><br/>
      </>
    }
    {!databaseFile && 
      <span>Select database file:</span>
    }
    {databaseFile && 
      <>
        <br/><br/>
        <span>Select a different database file:</span>
      </>
    }
    <input
        type="file"
        name="file"
        className="import-file"
        onChange={(e) => {
          if (e.target.files) {
            check_database_file(e.target.files[0].path);
          }
        }}          
    />
    <br/><br/>
    <span>Create a new database file:</span>
    <button 
      className="textButton"
      onClick={() => {
        const ipcRenderer = (window as any).ipcRenderer;
        ipcRenderer.send(channels.CREATE_DB);

        // Receive the new filename
        ipcRenderer.on(channels.LIST_NEW_DB_FILENAME, (arg) => {
          if (arg?.length > 0) {
            check_database_file(arg);
          }

          ipcRenderer.removeAllListeners(channels.LIST_NEW_DB_FILENAME);
        });

        // Clean the listener after the component is dismounted
        return () => {
          ipcRenderer.removeAllListeners(channels.LIST_NEW_DB_FILENAME);
        };
      }}>
        Create New
    </button>
  </>
    
  );
};


export default ConfigDB;
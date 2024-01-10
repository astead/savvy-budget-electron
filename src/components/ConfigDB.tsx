import React, { useState, useEffect } from 'react';
import { channels } from '../shared/constants.js';

/* 
  TODO:
  - allow DB file to be on Google Drive?
    Not sure we if need to do anything special here if we have a local copy of the file.
  - Show more DB data? transaction dates, # transactions, # accounts?
*/

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
    <table className="Table" cellSpacing={0} cellPadding={0}>
      <tbody>
    {databaseFile &&
      <tr className="TR">
        <td className="Table TC Right">Database:</td>
        <td className="Table TC Left">{databaseFile}</td>
      </tr>
    }
    {databaseFile && !databaseExists &&
      <tr className="TR">
        <td className="Table TC Right">Status:</td>
        <td className="Table TC Left">The database file does not exist.</td>
      </tr>
    }
    {databaseFile && databaseExists && !databaseVersion &&
      <tr className="TR">
        <td className="Table TC Right">Status:</td>
        <td className="Table TC Left">The database appears to be corrupted.</td>
      </tr>
    }
    {databaseFile && databaseExists && databaseVersion &&
      <tr className="TR">
        <td className="Table TC Right">Status:</td>
        <td className="Table TC Left">Database version: {databaseVersion}</td>
      </tr>
    }
    </tbody>
    </table>
    {databaseFile && <><br/><br/></>}
    <table className="Table" cellSpacing={0} cellPadding={0}><tbody>
    <tr className="TR">
      <td className="Table TC Right">
        {!databaseFile && 
          <span>Select database file:</span>
        }
        {databaseFile && 
          <span>Select a different database file:</span>
        }
      </td>
      <td className="Table TC Left">
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
      </td>
    </tr>
    <tr className="TR">
      <td className="Table TC Right">
        <span>Create a new database file:</span>
      </td>
      <td className="Table TC Left">
        <button 
          className="textButton"
          style={{ height: 'minHeight', paddingTop: '0px', paddingBottom: '0px', minHeight:''}}
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
      </td>
    </tr>
    </tbody>
  </table>
  </>
  );
};


export default ConfigDB;
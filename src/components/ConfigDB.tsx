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

  // Google Drive
  const [credentialsFile, setCredentialsFile] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [credentials, setCredentials] = useState<any>(null);

  const [client, setClient] = useState<any>(null);
  const [clientID, setClientID] = useState('');
  const [clientTemp, setClientTemp] = useState('');
  const [secret, setSecret] = useState('');
  const [secretTemp, setSecretTemp] = useState('');

 
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
  };

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
  };
  
  const handleListFiles = async () => {
    if (client) {
      const ipcRenderer = (window as any).ipcRenderer;
      ipcRenderer.send(channels.DRIVE_LIST_FILES, { credentials: credentials, tokens: client });
      
      // Receive the data
      ipcRenderer.on(channels.DRIVE_DONE_LIST_FILES, ({file_list}) => {
        console.log(file_list);

        ipcRenderer.removeAllListeners(channels.DRIVE_DONE_LIST_FILES);
      });

      // Clean the listener after the component is dismounted
      return () => {
        ipcRenderer.removeAllListeners(channels.DRIVE_DONE_LIST_FILES);
      };
    }
  }
  
  
  const handleAuthClick = async () => {
    if (!credentials) {
      console.error('Please upload the credentials file.');
      return;
    }
    
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.DRIVE_AUTH, {
      privateCreds: { clientEmail: clientID, privateKey: secret}, 
      credentials: credentials
    });
    
     // Receive the data
     ipcRenderer.on(channels.DRIVE_DONE_AUTH, ({ return_creds }) => {
      console.log(return_creds);
      setClient(return_creds);
      localStorage.setItem('drive-client', JSON.stringify({ client: return_creds }));
      ipcRenderer.removeAllListeners(channels.DRIVE_DONE_AUTH);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.DRIVE_DONE_AUTH);
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setCredentialsFile(file.path);
    }
  };

  const handleClientChange = () => {
    console.log("setting client to: ", clientTemp);
    setClientID(clientTemp);
    localStorage.setItem('drive-info', JSON.stringify({ clientID: clientTemp, secret: secret, creds: credentials }));
  };
  const handleSecretChange = () => {
    console.log("setting secret to: ", secretTemp);
    setSecret(secretTemp);
    localStorage.setItem('drive-info', JSON.stringify({ clientID: clientID, secret: secretTemp, creds: credentials }));
  };

  const readCredentialsFile = () => {
    const ipcRenderer = (window as any).ipcRenderer;
    const fs = ipcRenderer.require('fs')
    fs.readFile(credentialsFile, 'utf8', (err, data) => {
      if (err) throw err;
      
      const tmpCreds = JSON.parse(data.trim());
      setCredentials(tmpCreds);
      
      localStorage.setItem('drive-info', JSON.stringify({ clientID: clientID, secret: secret, creds: tmpCreds }));
    });
  }

  useEffect(() => {
    if (credentialsFile) {
      readCredentialsFile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentialsFile]);

  useEffect(() => {
    const databaseFile_str = localStorage.getItem('databaseFile');
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
          <span>Select local database file:</span>
        }
        {databaseFile && 
          <span>Select a different local database file:</span>
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
        <span>Create a new local database file:</span>
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
    <tr className="TR">
      <td className="Table TC Right">
        <span>Google Drive:</span>
      </td>
      <td className="Table TC Left">
        <input type="file" accept=".json" onChange={handleFileChange} />
        {credentials &&
          <>
            <table><tbody>
              <tr>
                <td className="txFilterLabelCell">
                  Client Email:
                </td>
                <td className="txFilterCell">
                  <input
                    name="DRIVEClient"
                    defaultValue={clientID}
                    onChange={(e) => setClientTemp(e.target.value)}
                    onBlur={handleClientChange}
                    className="filterSize"
                  />
                </td>
              </tr>
              <tr>
                <td className="txFilterLabelCell">
                  Secret:
                </td>
                <td className="txFilterCell">
                  <input
                    name="DRIVESecret"
                    defaultValue={secret}
                    onChange={(e) => setSecretTemp(e.target.value)}
                    onBlur={handleSecretChange}
                    className="filterSize"
                  />
                </td>
              </tr>
            </tbody></table>
            <br/>
            <button onClick={handleAuthClick} className="textButton">Authorize Google Drive</button>
            <br/>
            <button onClick={handleListFiles} className="textButton">List Google Drive Files</button>
          </>
        }
      </td>
    </tr>

    </tbody>
  </table>
  </>
  );
};


export default ConfigDB;
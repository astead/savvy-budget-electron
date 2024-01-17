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
  const [usingGoogleDrive, setUsingGoogleDrive] = useState(false);
  const [credentialsFile, setCredentialsFile] = useState<string>("");
  const [credentials, setCredentials] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [clientID, setClientID] = useState('');
  const [clientTemp, setClientTemp] = useState('');
  const [secret, setSecret] = useState('');
  const [secretTemp, setSecretTemp] = useState('');
  const [driveFileId, setDriveFileId] = useState<any>(null);
  const [driveFile, setDriveFile] = useState('');
  const [lockFileExists, setLockFileExists] = useState(false);

 
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
        ipcRenderer.send(channels.SET_DB_PATH, { DBPath: my_databaseFile });

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
  
  const handleUseDrive = async (useDrive) => {
    
    localStorage.setItem(
      'use-Google-Drive', 
      JSON.stringify({useGDrive: useDrive})
    );
    setUsingGoogleDrive(useDrive);
    if (useDrive) {
      // Setup everything.
      if (!client) {
        handleAuthClick();
      } else {
        handleGetFile();
      }
    }
  }

  const handlePushFile = async () => {
    if (client) {
      if (driveFileId) {
        const ipcRenderer = (window as any).ipcRenderer;
        ipcRenderer.send(channels.DRIVE_PUSH_FILE, { credentials: credentials, tokens: client, fileId: driveFileId.id });
        
        // Receive the data
        ipcRenderer.on(channels.DRIVE_DONE_PUSH_FILE, () => {
          console.log("Done pushing the file");

          ipcRenderer.removeAllListeners(channels.DRIVE_DONE_PUSH_FILE);
        });

        // Clean the listener after the component is dismounted
        return () => {
          ipcRenderer.removeAllListeners(channels.DRIVE_DONE_PUSH_FILE);
        };
      } else {
        console.log("Don't have driveFileId");
      }
    } else {
      console.log("Don't have client");
    }
  };
  
  const handleDeleteLock = async () => {
    console.log("handleDeleteLock");
    if (client) {
        const ipcRenderer = (window as any).ipcRenderer;
        ipcRenderer.send(channels.DRIVE_DELETE_LOCK, { credentials: credentials, tokens: client});
        setLockFileExists(false);
    } else {
      console.log("Don't have client");
    }
  };
  
  const handleGetFile = async () => {
    if (client) {
      setLockFileExists(false);
      const ipcRenderer = (window as any).ipcRenderer;
      ipcRenderer.send(channels.DRIVE_GET_FILE, { credentials: credentials, tokens: client });
      
      // Receive the data
      ipcRenderer.on(channels.DRIVE_DONE_GET_FILE, (return_obj) => {
        if (return_obj.fileName) {
          console.log("We got the file");
          check_database_file(return_obj.fileName);
          setDriveFile(return_obj.fileName);
        }
        if (return_obj.error) {
          console.log("Error getting the file: " + return_obj.error);
          if (return_obj.error.startsWith('Lock file already exists')) {
            setLockFileExists(true);
          }
        }

        ipcRenderer.removeAllListeners(channels.DRIVE_DONE_GET_FILE);
      });

      // Clean the listener after the component is dismounted
      return () => {
        ipcRenderer.removeAllListeners(channels.DRIVE_DONE_GET_FILE);
      };
    }
  };
  
  const handleListFiles = async () => {
    if (client) {

      console.log("creds: ", credentials);
      console.log("token: ", client);

      const ipcRenderer = (window as any).ipcRenderer;
      ipcRenderer.send(channels.DRIVE_LIST_FILES, { credentials: credentials, tokens: client });
      
      // Receive the data
      ipcRenderer.on(channels.DRIVE_DONE_LIST_FILES, ({file_list}) => {
        console.log(file_list);
        if (file_list?.length > 0) {
          setDriveFileId(file_list[0]);
        }
        localStorage.setItem('drive-file', JSON.stringify({ fileId: file_list[0] }));
        ipcRenderer.removeAllListeners(channels.DRIVE_DONE_LIST_FILES);
      });

      // Clean the listener after the component is dismounted
      return () => {
        ipcRenderer.removeAllListeners(channels.DRIVE_DONE_LIST_FILES);
      };
    }
  };
  
  
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

      handleListFiles();
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

    const drive_file_str = localStorage.getItem('drive-file');
    if (drive_file_str?.length) {
      const drive_file = JSON.parse(drive_file_str);
      if (drive_file) {
        setDriveFile(drive_file.fileId);
      }
    }

    const using_Drive_str = localStorage.getItem('use-Google-Drive');
    if (using_Drive_str?.length) {
      const using_Drive = JSON.parse(using_Drive_str);
      if (using_Drive) {
        setUsingGoogleDrive(using_Drive.useGDrive);
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
        <td className="Table TC Left">Could not read from the database, try getting it again or selecting a new one.</td>
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
              // TODO: in this case should we upload back to Drive what we were using if we were?
              handleUseDrive(false);
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
                // TODO: in this case should we upload back to Drive what we were using if we were?
                handleUseDrive(false);
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
        <button onClick={() => {
          handleUseDrive(usingGoogleDrive ? false : true);
          }} className="textButton">
          { usingGoogleDrive ? "Stop Using Google Drive" : "Use Google Drive" }
        </button>
        { usingGoogleDrive &&
          <>
            <br/>
            <input type="file" accept=".json" onChange={handleFileChange} />
          </>
        }
        { usingGoogleDrive && credentials &&
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
            <button onClick={handleGetFile} className="textButton">Get DB from Google Drive</button>
            { lockFileExists && 
              <>
                <br/>
                Lock files found, someone may be using the database. <br/>
                If you are confident no one is using the database, <br/>
                delete the lock files with the button below and <br/>
                try getting the database again.<br/>
                <button onClick={handleDeleteLock} className="textButton">Delete Lock File</button>
              </>
            }
            { driveFile && databaseVersion &&
              <>
                <br/>
                <button onClick={handlePushFile} className="textButton">Upload File</button>
              </>
            }
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
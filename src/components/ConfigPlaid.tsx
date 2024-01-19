import React, { useState, useEffect } from 'react';
import { channels } from '../shared/constants.js';
import * as dayjs from 'dayjs';
import Box from '@mui/material/Box';
import LinearProgressWithLabel from '@mui/material/LinearProgress';
import { PlaidLink,
  PlaidLinkOnSuccess,
  PlaidLinkOnEvent,
  PlaidLinkOnExit } from 'react-plaid-link';

export const ConfigPlaid = () => {
  
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState('');
  const [clientTemp, setClientTemp] = useState('');
  const [secret, setSecret] = useState('');
  const [secretTemp, setSecretTemp] = useState('');
  const [environment, setEnvironment] = useState('');
  const [environmentTemp, setEnvironmentTemp] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [link_Error, setLink_Error] = useState<string | null>(null);
  const [PLAIDAccounts, setPLAIDAccounts] = useState<PLAIDAccount[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = React.useState(0);

  
  interface PLAIDAccount {
    id: number; 
    institution: string;
    account_id: string; 
    mask: string;
    account_name: string;
    account_subtype: string;
    account_type: string;
    verification_status: string;
    item_id: string; 
    access_token: string;
    cursor: number;
    lastTx: number;
  }

  const getPLAIDInfo = () => {
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.PLAID_GET_KEYS);

    // Receive the data
    ipcRenderer.on(channels.PLAID_LIST_KEYS, (data) => {
      if (data?.length) {
        setClient(data[0].client_id);
        setClientTemp(data[0].client_id);
        setSecret(data[0].secret);
        setSecretTemp(data[0].secret);
        setEnvironment(data[0].environment);
        setEnvironmentTemp(data[0].environment);

        if (data[0].token) {
          setToken(data[0].token);
        }
        
        setLoading(false);
      }
      ipcRenderer.removeAllListeners(channels.PLAID_LIST_KEYS);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.PLAID_LIST_KEYS);
    };
  };



  const createLinkToken = () => {
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.PLAID_GET_TOKEN);

    // Receive the data
    ipcRenderer.on(channels.PLAID_LIST_TOKEN, (data) => {
      if (data.link_token?.length) {
        setToken(data.link_token);
        setLink_Error(null);
      }
      if (data.error_message?.length) {
        setLink_Error("Error: " + data.error_message);
      }

      ipcRenderer.removeAllListeners(channels.PLAID_LIST_TOKEN);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.PLAID_LIST_TOKEN);
    };
  };


  const getAccountList = () => {
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.PLAID_GET_ACCOUNTS);

    // Receive the data
    ipcRenderer.on(channels.PLAID_LIST_ACCOUNTS, (data) => {
      setPLAIDAccounts(data as PLAIDAccount[]);
      ipcRenderer.removeAllListeners(channels.PLAID_LIST_ACCOUNTS);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.PLAID_LIST_ACCOUNTS);
    };
  };

  const get_transactions = (acc : PLAIDAccount) => {
    setUploading(true);
    
    // Get transactions
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.PLAID_GET_TRANSACTIONS, 
      { access_token: acc.access_token,
        cursor: acc.cursor,
      }
    );

    // Listen for progress updates
    ipcRenderer.on(channels.UPLOAD_PROGRESS, (data) => {
      setProgress(data);
      if (data >= 100) {
        ipcRenderer.removeAllListeners(channels.UPLOAD_PROGRESS);
        setUploading(false);
      }
    });

    ipcRenderer.on(channels.PLAID_LIST_TRANSACTIONS, (data) => {
      if (data.error_message?.length) {
        setLink_Error("Error: " + data.error_message);
      }
      ipcRenderer.removeAllListeners(channels.PLAID_LIST_TRANSACTIONS);
    });
      
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.UPLOAD_PROGRESS);
      ipcRenderer.removeAllListeners(channels.PLAID_LIST_TRANSACTIONS);
    };
  };

  const onSuccess: PlaidLinkOnSuccess = (public_token, metadata) => {
    //console.log("Success linking: ", public_token, metadata);
    console.log("Calling into main to get access token. ");
    
    console.log("public token: ", public_token);
    console.log("metadata: ", metadata);
    
    metadata.accounts.forEach((account, index) => {
      console.log("Account: ", metadata?.institution?.name, " : ", account.name);
    });

    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.PLAID_SET_ACCESS_TOKEN, {public_token, metadata});
  };

  const onEvent: PlaidLinkOnEvent = (eventName, metadata) => {
    // log onEvent callbacks from Link
    // https://plaid.com/docs/link/web/#onevent
    console.log("onEvent:", eventName, metadata);
  };

  const onExit: PlaidLinkOnExit = (error, metadata) => {
    // log onExit callbacks from Link, handle errors
    // https://plaid.com/docs/link/web/#onexit
    console.log("Error:", error, metadata);
    if (error) {
      setLink_Error("Error: " + error.error_message);
    }
  };

  const handleClientChange = () => {
    if (!loading) {
      console.log("setting client to: ", clientTemp);
      setClient(clientTemp);
      update_PLAID_keys();
    }
  };
  const handleSecretChange = () => {
    if (!loading) {
      console.log("setting secret to: ", secretTemp);
      setSecret(secretTemp);
      update_PLAID_keys();
    }
  };
  const handleEnvironmentChange = () => {
    if (!loading) {
      console.log("setting env to: ", environmentTemp);
      setEnvironment(environmentTemp);
      update_PLAID_keys();
    }
  };

  const update_PLAID_keys = () => {
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.PLAID_SET_KEYS, 
      { client_id: clientTemp, secret: secretTemp, environment: environmentTemp }
    );
    setToken(null);
  };

  const NewPlaid = () => {
    return (
      <PlaidLink 
        className={"textButton" + (!token?" myButton-disabled":"")}
        style={{ cursor: 'pointer' }}
        token={token}
        onSuccess={onSuccess}
        onEvent={onEvent}
        onExit={onExit}
      >
        Link New Account
      </PlaidLink>
    );
  };

  useEffect(() => {
    getPLAIDInfo();
    getAccountList();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <>
    <table><tbody>
    <tr>
      <td className="txFilterLabelCell">
        Client ID:
      </td>
      <td className="txFilterCell">
        <input
          name="PLAIDClient"
          defaultValue={client}
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
          name="PLAIDSecret"
          defaultValue={secret}
          onChange={(e) => setSecretTemp(e.target.value)}
          onBlur={handleSecretChange}
          className="filterSize"
        />
      </td>
    </tr>
    <tr>
      <td className="txFilterLabelCell">
        Environment:
      </td>
      <td className="txFilterCell">
        <input
          name="PLAIDEnvironment"
          defaultValue={environment}
          onChange={(e) => setEnvironmentTemp(e.target.value)}
          onBlur={handleEnvironmentChange}
          className="filterSize"
        />
      </td>
    </tr>
  </tbody></table>
  <br/>
  {link_Error && 
    <div><br/>{link_Error}</div>
  }
  <>
    {!token && 
      <div>
        <button 
          className='textButton'
          onClick={() => createLinkToken()} >
          Get Link Token
        </button>
      </div>
    }
    {token &&
      <div>
        <div>
          <NewPlaid />
        </div>
        <div>
          <table className="Table" cellSpacing={1} cellPadding={1}>
            <thead>
              <tr className="Table THR">
                <th className="Table THR THRC">{'Bank'}</th>
                <th className="Table THR THRC">{'Last Transaction'}</th>
                <th className="Table THR THRC">{' '}</th>
              </tr>
            </thead>
            <tbody>
            { PLAIDAccounts.map((acc, index, myArray) => (
              <React.Fragment key={index}>
                { (index === 0 || (index > 0 && acc.access_token !== myArray[index - 1].access_token)) && (
                  <React.Fragment>
                  <tr className="Table TGHR">
                    <td className="Table THRC">{acc.institution}</td>
                    <td className="Table THRC">{acc.lastTx && dayjs(acc.lastTx).format('M/D/YYYY')}</td>
                    <td className="Table THRC">
                      <button 
                        className='textButton'
                        onClick={() => {
                          get_transactions(acc)
                        }} 
                        disabled={!token}>
                        Get Transactions
                      </button>
                    </td>
                  </tr>
                  
                  {uploading && 
                    <tr><td colSpan={3}>
                    <Box sx={{ width: '100%' }}>
                      <LinearProgressWithLabel value={progress} />
                    </Box>
                    </td></tr>
                  }
                  </React.Fragment>
                )}
                <tr key={index}>
                  <td colSpan={3} align='left'>{acc.account_name + '-' + acc.mask}</td>
                </tr>
              </React.Fragment>
            ))}
          </tbody></table>
        </div>
      </div>
    }
  </>
  </>
  );
};

export default ConfigPlaid;
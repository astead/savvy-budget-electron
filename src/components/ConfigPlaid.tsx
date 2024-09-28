import React, { useState, useEffect } from 'react';
import { channels } from '../shared/constants.js';
import * as dayjs from 'dayjs';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import LinearProgressWithLabel from '@mui/material/LinearProgress';
import { PlaidLinkOptions, usePlaidLink, 
  PlaidLinkOnSuccess,
  PlaidLinkOnExit } from 'react-plaid-link';

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 'fit-content',
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

/* 
  TODO:
  - Update list of accounts after adding new one
*/

export const ConfigPlaid = () => {
  
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [tokenExpiration, setTokenExpiration] = useState<string | null>(null);
  const [link_Error, setLink_Error] = useState<string | null>(null);
  const [PLAIDAccounts, setPLAIDAccounts] = useState<PLAIDAccount[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = React.useState(0);

  const [getStart, setGetStart] = React.useState('');
  const [getEnd, setGetEnd] = React.useState('');
  const [getAcc, setGetAcc] = React.useState<any>(null);
  const [updateConfig, setUpdateConfig] = React.useState<any>(null);
  //const isOAuthRedirect = window.location.href.includes('?oauth_state_id=');
  
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  
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

  
  const createLinkToken = () => {
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.PLAID_GET_TOKEN);

    // Receive the data
    ipcRenderer.on(channels.PLAID_LIST_TOKEN, (data) => {
      if (data.link_token?.length) {
        setToken(data.link_token);
        setTokenExpiration(data.expiration);
        setLink_Error(null);
        getAccountList();
      }
      if (data.error_message?.length) {
        console.log(data);
        setLink_Error("Error: " + data.error_message);
      }

      ipcRenderer.removeAllListeners(channels.PLAID_LIST_TOKEN);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.PLAID_LIST_TOKEN);
    };
  };


  const getAccountList = async () => {
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

  const update_login = (acc : PLAIDAccount) => {
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.PLAID_UPDATE_LOGIN, 
      { access_token: acc.access_token }
    );

    ipcRenderer.on(channels.PLAID_DONE_UPDATE_LOGIN, ({ link_token, error }) => {
      if (link_token) {
        get_updated_login(link_token);
      }
      if (error) {
        setLink_Error(error);
      }
      ipcRenderer.removeAllListeners(channels.PLAID_DONE_UPDATE_LOGIN);
    });
      
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.PLAID_DONE_UPDATE_LOGIN);
    };
  }

  const remove_login = (acc : PLAIDAccount) => {
    const ipcRenderer = (window as any).ipcRenderer;
    
    if (token) {
      if (acc.access_token.includes('production') && !token.includes('production')) {
        setLink_Error('You are trying to remove a production login but you have development link token.');
        return;
      }
      if (acc.access_token.includes('development') && !token.includes('development')) {
        setLink_Error('You are trying to remove a development login but you have production link token.');
        return;
      }
      ipcRenderer.send(channels.PLAID_REMOVE_LOGIN, 
        { access_token: acc.access_token }
      );

      ipcRenderer.on(channels.PLAID_DONE_REMOVE_LOGIN, () => {
        getAccountList();
      });
        
      // Clean the listener after the component is dismounted
      return () => {
        ipcRenderer.removeAllListeners(channels.PLAID_DONE_UPDATE_LOGIN);
      };
    } else {
      setLink_Error('You need a link token to remove a plaid account login.');
    }
  }

  const get_transactions = (acc : PLAIDAccount) => {
    // Clear error message
    setLink_Error(null);

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
        
        // Get new latest transaction dates
        getAccountList();
      }
    });

    ipcRenderer.on(channels.PLAID_LIST_TRANSACTIONS, (data) => {
      if (data.error_message?.length) {
        console.log(data);
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

  const force_get_transactions = (acc : PLAIDAccount, start_date, end_date) => {
    setUploading(true);
    handleClose();

    // Get transactions
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.PLAID_FORCE_TRANSACTIONS, 
      { access_token: acc.access_token,
        start_date: start_date,
        end_date: end_date
      }
    );

    // Listen for progress updates
    ipcRenderer.on(channels.UPLOAD_PROGRESS, (data) => {
      setProgress(data);
      if (data >= 100) {
        ipcRenderer.removeAllListeners(channels.UPLOAD_PROGRESS);
        setUploading(false);
        
        // Get new latest transaction dates
        getAccountList();
      }
    });

    // TODO: This is never being sent, why do we have this?
    ipcRenderer.on(channels.PLAID_DONE_FORCE_TRANSACTIONS, (data) => {
      if (data.error_message?.length) {
        console.log(data);
        setLink_Error("Error: " + data.error_message);
      }
      ipcRenderer.removeAllListeners(channels.PLAID_DONE_FORCE_TRANSACTIONS);
    });
      
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.UPLOAD_PROGRESS);
      ipcRenderer.removeAllListeners(channels.PLAID_LIST_TRANSACTIONS);
    };
  };

  const onSuccess: PlaidLinkOnSuccess = (public_token, metadata) => {
    console.log("Success linking new account. ");
    
    console.log("public token: ", public_token);
    console.log("metadata: ", metadata);
    
    metadata.accounts.forEach((account, index) => {
      console.log("Account: ", metadata?.institution?.name, " : ", account.name);
    });

    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.PLAID_SET_ACCESS_TOKEN, {public_token, metadata});
  };

  const onExit: PlaidLinkOnExit = (error, metadata) => {
    // log onExit callbacks from Link, handle errors
    // https://plaid.com/docs/link/web/#onexit
    console.log("Error:", error, metadata);
    if (error) {
      setLink_Error("Error: " + error.error_message);
    }
  };

  const get_updated_login = async (updateToken) => {
    const updateConfig: PlaidLinkOptions = {
      token: updateToken,
      onSuccess: (public_token, metadata) => {
        setUpdateConfig(null);
        // You do not need to repeat the /item/public_token/exchange
        // process when a user uses Link in update mode.
        // The Item's access_token has not changed.
        console.log("Success updating login", public_token, metadata);
      },
      onExit: (err, metadata) => {
        setUpdateConfig(null);
        //console.log("onExit: ", metadata);
        // The user exited the Link flow.
        if (err != null) {
          // The user encountered a Plaid API error prior
          // to exiting.
          //console.log("Error on exit: ", err);
          setLink_Error(err.display_message);
        }
        // metadata contains the most recent API request ID and the
        // Link session ID. Storing this information is helpful
        // for support.
      },
    };

    //console.log("created plaid link options: ", updateConfig);

    setUpdateConfig(updateConfig);
  } 

  const UpdatePlaid = () => {
    const { open: openUpdate, ready: readyUpdate } = usePlaidLink(updateConfig);

    useEffect(() => {
      if (readyUpdate) {
        //console.log("calling plaid link to update login");
        openUpdate();
      }
    }, [readyUpdate, openUpdate]);

    return (
      <></>
    );
  };

  const { open: openLink, ready: readyLink } = usePlaidLink({
    token: token,
    onSuccess: onSuccess,
    onExit: onExit,
  });

 
  useEffect(() => {
    createLinkToken();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <>
    <table><tbody>
    <tr>
      <td className="txFilterLabelCell">
        Link Token:
      </td>
      <td className="txFilterCell" align="left">
        {token &&
          <>
            {
              token.substring(0,20) + '... Expires: ' +
              dayjs(tokenExpiration).toString()
            }
          </>
        }
        <button 
          className='textButton'
          onClick={() => createLinkToken()} >
          {!token && 'Get'}{token && 'Update'} Link Token
        </button>
      </td>
    </tr>
  </tbody></table>
  <br/>
  {link_Error && 
    <div className="Error"><br/>{link_Error}</div>
  }
  <>
    {token &&
      <div>
        <table className="Table" cellSpacing={1} cellPadding={1}>
          <tbody>
            <tr>
              <td colSpan={2} align="left">
                {updateConfig && <UpdatePlaid/>}
                <button className='textButton' onClick={() => openLink()} disabled={!readyLink}>
                  Connect a new bank account
                </button>
              </td>
            </tr>
          {uploading && 
            <tr><td colSpan={2}>
            <Box sx={{ width: '100%' }}>
              <LinearProgressWithLabel value={progress} />
            </Box>
            </td></tr>
          }
          { PLAIDAccounts.map((acc, index, myArray) => (
            <React.Fragment key={index}>
              { (index === 0 || (index > 0 && acc.access_token !== myArray[index - 1].access_token)) && (
                <React.Fragment>
                <tr className="Table TGHR">
                  <td className="Table THRC">
                    {acc.institution}
                    {acc.access_token.includes('production')?' (prod)':' (dev)'}
                  </td>
                  <td className="Table THRC">
                    <button 
                      className='textButton'
                      onClick={() => {
                        remove_login(acc)
                      }} 
                      disabled={!token}>
                      Remove
                    </button>
                    <button 
                      className='textButton'
                      onClick={() => {
                        update_login(acc)
                      }} 
                      disabled={!token}>
                      Update Login
                    </button>
                    <button 
                      className='textButton'
                      onClick={() => {
                        get_transactions(acc)
                      }} 
                      disabled={!token}>
                      Update
                    </button>
                    <button 
                      className='textButton'
                      onClick={() => {
                        // Get the latest transaction date for this account
                        const filtered = PLAIDAccounts.filter((a) => a.access_token === acc.access_token);
                        const only_dates = filtered.map((a) => new Date(a.lastTx + 'T00:00:00').getTime());
                        const max_date = Math.max(...only_dates);
                        const max_date_str = dayjs(max_date).format('YYYY-MM-DD');
                        if (max_date_str) {
                          setGetStart(max_date_str);
                        } else {
                          setGetStart(dayjs().startOf('month').format("YYYY-MM-DD"));
                        }
                        setGetEnd(dayjs().format("YYYY-MM-DD"));
                        setGetAcc(acc);
                        
                        handleOpen();
                      }} 
                      disabled={!token}>
                      Force Get
                    </button>
                  </td>
                </tr>
                </React.Fragment>
              )}
              <tr key={index}>
                <td align='left'>
                  {acc.account_name + '-' + acc.mask}
                </td>
                <td align='right'>
                  {acc.lastTx && dayjs(acc.lastTx).format('M/D/YYYY')}
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody></table>
        <Modal
          open={open}
          onClose={handleClose}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        >
          <Box sx={style}>
            Get transactions<br/>
            <table><tbody>
            <tr>
              <td>from:</td>
              <td>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  value={dayjs(getStart)}
                  onChange={(newValue) => {
                    const new_date = newValue ? newValue.format("YYYY-MM-DD") : '';
                    setGetStart(new_date);
                  }}
                  sx={{ width:150, pr:0 }}
                  />
                </LocalizationProvider>
              </td>
            </tr>
            <tr>
              <td>to:</td>
              <td>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  value={dayjs(getEnd)}
                  onChange={(newValue) => {
                    const new_date = newValue ? newValue.format("YYYY-MM-DD") : '';
                    setGetEnd(new_date);
                  }}
                  sx={{ width:150, pr:0 }}
                  />
                </LocalizationProvider>
              </td>
            </tr>
            </tbody></table>
            <br/>
            <button 
              className='textButton'
              onClick={() => {
                force_get_transactions(getAcc, getStart, getEnd);
              }} 
              disabled={!token}>
              Get Those Transactions!
            </button>
          </Box>
        </Modal>
      </div>
    }
  </>
  </>
  );
};

export default ConfigPlaid;
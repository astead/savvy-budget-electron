import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import * as dayjs from 'dayjs';
import { EditText } from 'react-edit-text';
import { channels } from '../shared/constants.js';

export const ConfigAccount = () => {

  const [accountData, setAccountData] = useState<any[]>([]);

  const load_accounts = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_ACCOUNTS);

    // Receive the data
    ipcRenderer.on(channels.LIST_ACCOUNTS, (arg) => {
      setAccountData(arg);
      ipcRenderer.removeAllListeners(channels.LIST_ACCOUNTS);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_ACCOUNTS);
    };
  }

  const handleAccountDelete = (id, isActive) => {
    // Request we delete the account in the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.DEL_ACCOUNT, {id, value: (isActive===0?1:0)});

    // Receive the data
    ipcRenderer.on(channels.DONE_DEL_ACCOUNT, (arg) => {
      load_accounts();
      ipcRenderer.removeAllListeners(channels.DONE_DEL_ACCOUNT);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.DONE_DEL_ACCOUNT);
    };
  };

  useEffect(() => {
    load_accounts();
  }, []);

  return (
        
    <table className="Table" cellSpacing={0} cellPadding={0}>
    <thead>
      <tr className="Table THR">
        <th className="Table THR THRC">{'Account'}</th>
        <th className="Table THR THRC">{'Name'}</th>
        <th className="Table THR THRC">{'Last Transaction'}</th>
        <th className="Table THR THRC">{'    '}</th>
      </tr>
    </thead>

    <tbody>
      {
        accountData.map(({ id, refNumber, account, isActive, lastTx }, index) => (
          <tr key={"acc-" + id} className="Table TR">
            <td className="Table TC Left">{refNumber}</td>
            <td className="Table TC Left">
              
              <EditText
                name={id.toString()}
                defaultValue={account}
                onSave={({name, value, previousValue}) => {
                  // Request we rename the account in the DB
                  const ipcRenderer = (window as any).ipcRenderer;
                  ipcRenderer.send(channels.UPDATE_ACCOUNT, { id, new_value: value });
                }}
                style={{padding: '0px', margin: '0px', minHeight: '1rem'}}
                className={"editableText"}
                inputClassName={"normalInput"}
              />
            </td>
            <td className="Table TC Right">{lastTx && dayjs(lastTx).format('M/D/YYYY')}</td>
            <td className="Table TC">
            <div 
              className={"Toggle" + (!isActive?" Toggle-active":"")}
              onClick={() => handleAccountDelete(id, isActive)}>
                <FontAwesomeIcon icon={faEyeSlash} />
            </div>
            </td>
          </tr>
        ))
      }
    </tbody>
  </table>
  );
};


export default ConfigAccount;
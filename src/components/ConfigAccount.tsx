import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEyeSlash } from "@fortawesome/free-solid-svg-icons"
import Moment from 'moment';
import EditableAccount from '../helpers/EditableAccount.tsx';
import { channels } from '../shared/constants.js';
import { CategoryDropDown } from '../helpers/CategoryDropDown.tsx';
import { EditableKeyword } from '../helpers/EditableKeyword.tsx';


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
              <EditableAccount
                initialID={id.toString()}
                initialName={account} />
            </td>
            <td className="Table TC Right">{lastTx && Moment(lastTx).format('M/D/YYYY')}</td>
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
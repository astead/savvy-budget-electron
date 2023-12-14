import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { channels } from '../shared/constants.js';
import { MonthSelector } from '../helpers/MonthSelector.tsx';
import { CategoryDropDown } from '../helpers/CategoryDropDown.tsx';
import { KeywordSave } from '../helpers/KeywordSave.tsx';
import Moment from 'moment';
//import Papa from 'papaparse';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileImport } from "@fortawesome/free-solid-svg-icons";

/*
 TODO:
  - add filter options:
    - account
    - bank
    - date?
    - amount
    - description
  - add split transactions
  - add hide transactions
  - add marking as duplicate, maybe with https://fontawesome.com/icons/arrows-rotate?f=classic&s=solid
  - first column: split the transaction
  - modify description?
  - popup window to add notes, tags, etc and edit item
  - ERROR: Warning: Each child in a list should have a unique "key" prop.
*/

export const Transactions: React.FC = () => {
  
  interface TransactionNodeData {
    txID: number;
    catID: number; 
    envID: number; 
    category: string;
    envelope: string; 
    accountID: number;  
    account: string;
    txAmt: number;
    txDate: number;
    description: string;
    keywordEnvID: number;
    isDuplicate: number;
  }
  interface EnvelopeList {
    envID: number; 
    category: string;
    envelope: string; 
  }
  
  function formatCurrency(currencyNumber:number) {
    return currencyNumber.toLocaleString('en-EN', {style: 'currency', currency: 'USD'});
  }

  const [txData, setTxData] = useState<TransactionNodeData[]>([]);
  const [myStartMonth, setMyStartMonth] = useState(-8);
  const [myCurMonth, setMyCurMonth] = useState(8);
  const [year, setYear] = useState((new Date()).getFullYear());
  const [month, setMonth] = useState((new Date()).getMonth()+1);
  const [curMonth, setCurMonth] = useState(Moment(new Date(year, month)).format('YYYY-MM-DD'));
  const [envList, setEnvList] = useState<EnvelopeList[]>([]);
  const [envListLoaded, setEnvListLoaded] = useState(false);
  const [filename, setFilename] = useState('');
  
  const monthSelectorCallback = ({ childStartMonth, childCurMonth }) => {    
    // Need to adjust our month/year to reflect the change
    let tmpDate = new Date(year, month + childCurMonth - myCurMonth);

    setMyStartMonth(childStartMonth);
    setMyCurMonth(childCurMonth);
    setYear(tmpDate.getFullYear());
    setMonth(tmpDate.getMonth());
    setCurMonth(Moment(tmpDate).format('YYYY-MM-DD'));
  }

  const load_transactions = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_TX_DATA, Moment(new Date(year, month)).format('YYYY-MM-DD'));

    // Receive the data
    ipcRenderer.on(channels.LIST_TX_DATA, (arg) => {
      setTxData(arg as TransactionNodeData[]);
      ipcRenderer.removeAllListeners(channels.LIST_TX_DATA);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_TX_DATA);
    };
  }

  const load_envelope_list = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_ENV_LIST);

    // Receive the data
    ipcRenderer.on(channels.LIST_ENV_LIST, (arg) => {
      setEnvList(arg as TransactionNodeData[]);
      setEnvListLoaded(true);
      ipcRenderer.removeAllListeners(channels.LIST_ENV_LIST);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_ENV_LIST);
    };
  }

  const handleImport = async () => {
    console.log("about to try and read file:", filename);
   
    const ipcRenderer = (window as any).ipcRenderer;
    const fs = ipcRenderer.require('fs')
    
    fs.readFile(filename, 'utf8', function(err, ofxString) {
      
      console.log("reading file");
      if (err) {
        console.log(err.message);
      } else {
        console.log("read file successfully");
        
        // Insert this transaction
        ipcRenderer.send(channels.IMPORT_OFX, ofxString);
        
      }
    });
  }

  const save_file_name = (event) => {
    console.log("set filename: ", event.target.files[0].path);
    setFilename(event.target.files[0].path);
  }

  const import_mint = (event) => {
    /*
    Papa.parse(event.target.files[0], {
      header: false,
      skipEmptyLines: true,
      complete: function (results) {
        
        // Insert this transaction
        const ipcRenderer = (window as any).ipcRenderer;
        ipcRenderer.send(channels.ADD_TX, results.data);
      }
    });
    */
  }

  useEffect(() => {
    load_transactions();
  }, [curMonth]);

  useEffect(() => {
    load_envelope_list();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {<Header />}
      </header>
      <div>
        Transactions<br/>
        <MonthSelector numMonths="10" startMonth={myStartMonth} curMonth={myCurMonth} parentCallback={monthSelectorCallback} />
        <br/>
        {false &&
          <input
            type="file"
            name="file"
            accept=".csv"
            onChange={import_mint}
            style={{ display: "block", margin: "10px auto" }}
          />
        }
        <div className="import-container">
          <input
              type="file"
              name="file"
              accept=".qfx"
              className="import-file"
              onChange={save_file_name}
          />
          <button 
            className='import'
            onClick={handleImport}>
              <FontAwesomeIcon icon={faFileImport} />
          </button>
        </div>
        <br/>
        {txData?.length > 0 && envListLoaded &&
          <table className="TransactionTable" cellSpacing={0} cellPadding={0}>
            <>
              <thead className="TransactionTableHeader">
                <tr className="TransactionTableHeaderRow">
                  <th className="TransactionTableHeaderCell">{' '}</th>
                  <th className="TransactionTableHeaderCellDate">{'Date'}</th>
                  <th className="TransactionTableHeaderCell">{'Description'}</th>
                  <th className="TransactionTableHeaderCellCurr">{'Amount'}</th>
                  <th className="TransactionTableHeaderCell">{'Envelope'}</th>
                  <th className="TransactionTableHeaderCell">{' '}</th>
                </tr>
              </thead>
    
              <tbody className="TransactionTableBody">
                {txData.map((item, index, myArray) => (
                  <>
                  <tr key={item.envID} className={"TransactionTableRow"+(item.isDuplicate === 1 ? "-duplicate":"")}>
                    <td className="TransactionTableCellCurr">&nbsp;</td>
                    <td className="TransactionTableCellDate">{Moment(item.txDate).format('M/D/YYYY')}</td>
                    <td className="TransactionTableCell">{item.description}</td>
                    <td className="TransactionTableCellCurr">{formatCurrency(item.txAmt)}</td>
                    <td className="TransactionTableCell">
                      <CategoryDropDown 
                        txID={item.txID}
                        envID={item.envID}
                        name={item.category + " : " + item.envelope}
                        data={envList}
                      />
                    </td>
                    <td className="TransactionTableCell">
                        <KeywordSave
                          txID={item.txID}
                          envID={item.envID}
                          description={item.description}
                          keywordEnvID={item.keywordEnvID} />
                    </td>
                  </tr>
                  </>
                ))}
              </tbody>
            </>
          </table>
        }
      </div>
    </div>
  );
}
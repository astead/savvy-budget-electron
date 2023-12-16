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
  - Import Paypal
  - import Venmo
  - import PLAID
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
      setEnvList(arg as EnvelopeList[]);
      setEnvListLoaded(true);
      ipcRenderer.removeAllListeners(channels.LIST_ENV_LIST);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_ENV_LIST);
    };
  }

  function nthIndex(str, pat, n){
    var L= str.length, i= -1;
    while(n-- && i++<L){
        i= str.indexOf(pat, i);
        if (i < 0) break;
    }
    return i;
  }

  const handleChange = ({id, new_value}) => {
    console.log('handleChange: updating category ');
    
    // Request we update the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.UPDATE_TX_ENV, [id, new_value]);
  };

  const handleImport = async () => {
    const ipcRenderer = (window as any).ipcRenderer;
    const fs = ipcRenderer.require('fs')
    
    fs.readFile(filename, 'utf8', function(err, ofxString) {
      if (err) {
        console.log(err.message);
      } else {
        // Insert this transaction
        if (filename.toLowerCase().endsWith("qfx")) {
          ipcRenderer.send(channels.IMPORT_OFX, ofxString);
        }
        if (filename.toLowerCase().endsWith("csv")) {
          let account_string = '';
          let i = filename.lastIndexOf("/");
          let j = filename.lastIndexOf("\\");
          let short_filename = filename.substring((i===-1?j:i)+1);

          if (short_filename.toLowerCase().startsWith("sofi-")) {
            let separator = nthIndex(short_filename, "-", 3);
            if (separator > 0) {
              account_string = short_filename.substring(0,separator);
            }
          } else if (ofxString.includes("Statement Period Venmo Fees")) {
              account_string = "Venmo";
          } else {
            let PayPalHeader = '"Date","Time","TimeZone","Name","Type","Status","Currency","Gross","Fee","Net","From Email Address","To Email Address","Transaction ID","Shipping Address","Address Status","Item Title","Item ID","Shipping and Handling Amount","Insurance Amount","Sales Tax","Option 1 Name","Option 1 Value","Option 2 Name","Option 2 Value","Reference Txn ID","Invoice Number","Custom Number","Quantity","Receipt ID","Balance","Address Line 1","Address Line 2/District/Neighborhood","Town/City","State/Province/Region/County/Territory/Prefecture/Republic","Zip/Postal Code","Country","Contact Phone Number","Subject","Note","Country Code","Balance Impact"';
            if (ofxString.includes(PayPalHeader)) {
              account_string = "PayPal";
            }
          }

          ipcRenderer.send(channels.IMPORT_CSV, [account_string, ofxString]);
        }
      }
    });
  }

  const save_file_name = (event) => {
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
              accept=".qfx,.csv"
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
                {txData.map((item, index) => (
                  <tr key={index} className={"TransactionTableRow"+(item.isDuplicate === 1 ? "-duplicate":"")}>
                    <td className="TransactionTableCellCurr">&nbsp;</td>
                    <td className="TransactionTableCellDate">{Moment(item.txDate).format('M/D/YYYY')}</td>
                    <td className="TransactionTableCell">{item.description}</td>
                    <td className="TransactionTableCellCurr">{formatCurrency(item.txAmt)}</td>
                    <td className="TransactionTableCell">
                      <CategoryDropDown 
                        id={item.txID}
                        envID={item.envID}
                        data={envList}
                        changeCallback={handleChange}
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
                ))}
              </tbody>
            </>
          </table>
        }
      </div>
    </div>
  );
}
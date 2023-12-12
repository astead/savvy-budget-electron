import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { channels } from '../shared/constants.js'
import { MonthSelector } from '../helpers/MonthSelector.tsx'
import Moment from 'moment';
import Papa from 'papaparse';

/*
 TODO:
  - Make account a drop down, with its own helper component
  - import page.
  - keyword assign page? or maybe within this? or add to configure?
  - add filter options:
    - account
    - bank
    - date?
    - amount
    - description
  - add split transactions
  - add hide transactions
  - add marking as duplicate
  - start at the end of the month list, looking back
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
  }
  
  function formatCurrency(currencyNumber:number) {
    return currencyNumber.toLocaleString('en-EN', {style: 'currency', currency: 'USD'});
  }

  const [txData, setTxData] = useState<TransactionNodeData[]>([]);
  const [myStartMonth, setMyStartMonth] = useState(0);
  const [myCurMonth, setMyCurMonth] = useState(0);
  const [year, setYear] = useState((new Date()).getFullYear());
  const [month, setMonth] = useState((new Date()).getMonth()+1);
  const [curMonth, setCurMonth] = useState(Moment(new Date(year, month)).format('YYYY-MM-DD'));
  
  const monthSelectorCallback = ({ childStartMonth, childCurMonth }) => {    
    // Need to adjust our month/year to reflect the change
    let tmpDate = new Date(year, month + childStartMonth + childCurMonth - myCurMonth);
        
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

  const import_mint = (event) => {
    Papa.parse(event.target.files[0], {
      header: false,
      skipEmptyLines: true,
      complete: function (results) {
        
        // Insert this transaction
        const ipcRenderer = (window as any).ipcRenderer;
        ipcRenderer.send(channels.ADD_TX, results.data);
         
      }
    });
  }

  useEffect(() => {
    load_transactions();
  }, [curMonth]);

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
        <br/>
        {txData?.length > 0 &&
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
                  <tr key={item.envID} className="TransactionTableRow">
                    <td className="TransactionTableCellCurr">&nbsp;</td>
                    <td className="TransactionTableCellDate">{Moment(item.txDate).format('M/D/YYYY')}</td>
                    <td className="TransactionTableCell">{item.description}</td>
                    <td className="TransactionTableCellCurr">{formatCurrency(item.txAmt)}</td>
                    <td className="TransactionTableCell">{item.category + " : " + item.envelope}</td>
                    <td className="TransactionTableCellCurr">&nbsp;</td>
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
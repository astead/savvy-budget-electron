import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { channels } from '../shared/constants.js'
import { useTheme } from '@table-library/react-table-library/theme';
import { getTheme } from '@table-library/react-table-library/baseline';
import { EditableBudget } from '../helpers/EditableBudget.tsx';
import Moment from 'moment';


export const Transactions: React.FC = () => {
  
  interface TransactionNodeData {
    txID: number;
    catID: number; 
    envID: number; 
    category: string;
    envelope: string; 
    accountID: number;  
    account: string;
    txAmount: number;
    description: string;
  }

  const numMonths = 10;
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  
  const [curMonth, setCurMonth] = useState(Moment(new Date(year, month)).format('YYYY-MM-DD'));
  const [curMonthIter, setCurMonthIter] = useState(0);
  
  const arrayMonths = Array.from({length: numMonths}, (item, i) => {
    const myDate = new Date(year, month+i);
    const monthString = myDate.toLocaleString('en-US', {month: 'short'}) + "\n" + myDate.toLocaleString('en-US', {year: 'numeric'}) ;
    return { 'label': monthString };
  });

  function monthDiff(d1, d2) {
    var months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    return months <= 0 ? 0 : months;
  }
  
  function formatCurrency(currencyNumber:number) {
    return currencyNumber.toLocaleString('en-EN', {style: 'currency', currency: 'USD'});
  }

  const [txData, setTxData] = useState<TransactionNodeData[]>([]);
  

  useEffect(() => {
    const ipcRenderer = (window as any).ipcRenderer;

    // Signal we want to get data
    //console.log('Calling main:get_data');
    ipcRenderer.send(channels.GET_TX_DATA);

    // Receive the data
    ipcRenderer.on(channels.LIST_TX_DATA, (arg) => {
      
      const sortedData = arg as TransactionNodeData[];
      //console.log('initial load: sortedData:', sortedData);
     
      //console.log('initial load: setting budgetData from sortedData')
      setTxData(sortedData as TransactionNodeData[]);
            
      ipcRenderer.removeAllListeners(channels.LIST_TX_DATA);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_TX_DATA);
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {<Header />}
      </header>
      <div>
        Transactions<br/>
        <article className="months-container">
          {arrayMonths && arrayMonths.map((myMonth, index) => {
            return (
              <div key={"month-"+index} className={"month-item"+(curMonthIter=== index ? "-selected":"")}>
                {myMonth.label.toString()}
              </div>
            )
          })}
        </article>
        <br/>
        <br/>
        
      </div>
    </div>
  );
}
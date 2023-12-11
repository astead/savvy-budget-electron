import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { channels } from '../shared/constants.js'
import { MonthSelector } from '../helpers/MonthSelector.tsx'
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
  
  function formatCurrency(currencyNumber:number) {
    return currencyNumber.toLocaleString('en-EN', {style: 'currency', currency: 'USD'});
  }

  const [txData, setTxData] = useState<TransactionNodeData[]>([]);
  const [myStartMonth, setMyStartMonth] = useState(0);
  const [myCurMonth, setMyCurMonth] = useState(0);
  
  const monthSelectorCallback = ({ startMonth, curMonth }) => {
    setMyStartMonth(startMonth);
    setMyCurMonth(curMonth);
  }

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
        <MonthSelector numMonths="10" startMonth={myStartMonth} curMonth={myCurMonth} parentCallback={monthSelectorCallback} />
        <br/>
        <br/>
        
      </div>
    </div>
  );
}
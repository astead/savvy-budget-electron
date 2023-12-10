import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { channels } from '../shared/constants.js'
import {
  Table,
  Header as TableHeader,
  HeaderRow,
  Body,
  Row,
  HeaderCell,
  Cell,
 } from '@table-library/react-table-library/table';
import { useTheme } from '@table-library/react-table-library/theme';
import { getTheme } from '@table-library/react-table-library/baseline';


export const Envelopes: React.FC = () => {
  
  const [curMonthNode, setCurMonthNode] = useState(0);

  const numMonths = 10;
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();

  const arrayMonths = Array.from({length: numMonths}, (item, i) => {
    const myDate = new Date(year, month+i);
    const monthString = myDate.toLocaleString('en-US', {month: 'short'}) + "\n" + myDate.toLocaleString('en-US', {year: 'numeric'}) ;
    return { 'label': monthString };
  });

  function formatCurrency(currencyNumber:number) {
    return currencyNumber.toLocaleString('en-EN', {style: 'currency', currency: 'USD'});
  }

  const compare = (a,b) => {
    if (a.category === 'Income' || b.category === 'Income') {
      if (a.category === 'Income' && b.category !== 'Income') {
        return -1;
      }
      if (a.category !== 'Income' && b.category === 'Income') {
        return 1;
      }
      return 0;
    } else {
      if (a.category < b.category) {
        return -1;
      }
      if (a.category > b.category) {
        return 1;
      }
      return 0;
    }
  };

  const load_PrevBudget = () => {
    const ipcRenderer = (window as any).ipcRenderer;
    
    // Signal we want to get data
    //console.log('Calling main:get_data');
    ipcRenderer.send(channels.GET_PREV_BUDGET, new Date(year, month-1));

    // Receive the data
    ipcRenderer.on(channels.LIST_PREV_BUDGET, (arg) => {

      //const sortedData = Object.values(arg).sort(compare);
      /*
      TODO: Test this when we have some data
      console.log('arg:', arg);
      console.log('data:', data);
      
      const tmpData = [...data[0].nodes];

      for (let i=0; i < arg.length; i++) {
        tmpData.map(el => (
          el.envID === arg[i].envelopeID ? {...el, prevBudget: arg[i].txAmt} : el
        ))
      };      
      
      setData({nodes:tmpData});
      */

      ipcRenderer.removeAllListeners(channels.LIST_PREV_BUDGET);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_PREV_BUDGET);
    };

  }
  
  const [data, setData] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const ipcRenderer = (window as any).ipcRenderer;

    // Signal we want to get data
    //console.log('Calling main:get_data');
    ipcRenderer.send(channels.GET_CAT_ENV);

    // Receive the data
    ipcRenderer.on(channels.LIST_CAT_ENV, (arg) => {
      
      const defaultValues = {
        prevBudget: 0,
        prevActual: 0,
        currBalance: 0,
        currBudget: 0,
        monthlyAvg: 0,
      };

      for (let i=0; i < arg.length; i++) {
        arg[i] = {...arg[i], ...defaultValues};
      };
      const sortedData = Object.values(arg).sort(compare);
      //console.log('sorted:', sortedData);
     
      setData({nodes:sortedData});
      
      setLoaded(true);

      load_PrevBudget();
      
      ipcRenderer.removeAllListeners(channels.LIST_CAT_ENV);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_CAT_ENV);
    };

  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {<Header />}
      </header>
      <div>
        Envelopes<br/>
        <article className="months-container">
          {arrayMonths && arrayMonths.map((myMonth, index) => {
            return (
              <div key={"month-"+index} className={"month-item"+(curMonthNode === index ? "-selected":"")}>
                {myMonth.label.toString()}
              </div>
            )
          })}
        </article>
        <br/>
        {loaded &&
          <Table data={data} >
            {(tableList) => (
            <>
              <TableHeader>
                <HeaderRow>
                  <HeaderCell></HeaderCell>
                  <HeaderCell>Envelope</HeaderCell>
                  <HeaderCell>Prev Budget</HeaderCell>
                  <HeaderCell>Prev Actual</HeaderCell>
                  <HeaderCell>Curr Balance</HeaderCell>
                  <HeaderCell>Budget</HeaderCell>
                  <HeaderCell>Monthly Avg</HeaderCell>
                  <HeaderCell></HeaderCell>
                </HeaderRow>
              </TableHeader>
    
              <Body>
                {tableList.map((item) => (
                  <Row key={item.envID} item={item}>
                    <Cell></Cell>
                    <Cell>{item.envelope}</Cell>
                    <Cell>{formatCurrency(item.prevBudget)}</Cell>
                    <Cell>{formatCurrency(item.prevActual)}</Cell>
                    <Cell>{formatCurrency(item.currBalance)}</Cell>
                    <Cell>{formatCurrency(item.currBudget)}</Cell>
                    <Cell>{formatCurrency(item.monthlyAvg)}</Cell>
                    <Cell></Cell>
                  </Row>
                ))}
              </Body>
            </>
          )}
          </Table>
        }
      </div>
    </div>
  );
}
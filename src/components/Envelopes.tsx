import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { channels } from '../shared/constants.js'
import { CompactTable } from '@table-library/react-table-library/compact';
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

  const COLUMNS = [
    { label: '', renderCell: (item) => null },
    { label: 'Envelope', renderCell: (item) => item.envelope },
    { label: 'Prev Budget', renderCell: (item) => null },
    { label: 'Prev Actual', renderCell: (item) => null },
    { label: 'Curr Balance', renderCell: (item) => null },
    { label: 'Budget', renderCell: (item) => null },
    { label: 'Monthly Avg', renderCell: (item) => null },
    { label: '', renderCell: (item) => null },
  ];
  
  const [data, setData] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const ipcRenderer = (window as any).ipcRenderer;

    // Signal we want to get data
    //console.log('Calling main:get_data');
    ipcRenderer.send(channels.GET_BUDGET);

    // Receive the data
    ipcRenderer.on(channels.LIST_BUDGET, (arg) => {

      const sortedData = Object.values(arg).sort(compare);
      //console.log('sorted:', {nodes:sortedData});
      
      setData({nodes:sortedData});
      
      setLoaded(true);
      
      ipcRenderer.removeAllListeners(channels.LIST_BUDGET);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_BUDGET);
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
          <CompactTable columns={COLUMNS} data={data} />
        }
      </div>
    </div>
  );
}
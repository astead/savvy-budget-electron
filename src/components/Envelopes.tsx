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


  const COLUMNS = [
    { label: '', renderCell: (item) => null },
    { label: 'Envelope', renderCell: (item) => item.envelope },
    { label: 'Prev Budget', renderCell: (item) => item.prevBudget },
    { label: 'Prev Actual', renderCell: (item) => item.prevActual },
    { label: 'Curr Balance', renderCell: (item) => item.currBalance },
    { label: 'Budget', renderCell: (item) => item.budget },
    { label: 'Monthly Avg', renderCell: (item) => item.monthlyAvg },
    { label: '', renderCell: (item) => null },
  ];

  const nodes = [
    {
      envelope: 'env',
      prevBudget: 'prevBudget',
      prevActual: 'prevActual',
      currBalance: 'currBalance',
      budget: 'budget',
      monthlyAvg: 'monthlyAvg',
    },
  ];
  const data = { nodes };
  

  return (
    <div className="App">
      <header className="App-header">
        {<Header />}
      </header>
      <div>
        Envelopes<br/>
        <article className="months-container">
          {arrayMonths.map((myMonth, index) => {
            return (
              <div className={"month-item"+(curMonthNode === index ? "-selected":"")}>
                {myMonth.label.toString()}
              </div>
            )
          })}
        </article>
        <br/>
        <CompactTable columns={COLUMNS} data={data} />
      </div>
    </div>
  );
}
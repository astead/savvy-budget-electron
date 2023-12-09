import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { channels } from '../shared/constants.js'
import { CompactTable } from '@table-library/react-table-library/compact';
import { useTheme } from '@table-library/react-table-library/theme';
import { getTheme } from '@table-library/react-table-library/baseline';


export const Envelopes: React.FC = () => {
  
  const numMonths = 10;
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();

  const arrayMonths = Array.from({length: numMonths}, (item, i) => {
    const myDate = new Date(year, month+i);
    const monthString = myDate.toLocaleString('en-US', {month: 'short'}) + "\n" + myDate.toLocaleString('en-US', {year: 'numeric'}) ;
    return { 'label': monthString };
  });

  


  
  

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
              <div className="month-item">
                {myMonth.label.toString()}
              </div>
            )
          })}
        </article>
        <br/>
        
      </div>
    </div>
  );
}
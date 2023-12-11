import React, { useEffect, useState } from 'react';
import 'react-edit-text/dist/index.css';
import { channels } from '../shared/constants.js'
import Moment from 'moment';
import { EditableBudget } from '../helpers/EditableBudget.tsx';

export const MonthSelector = ({ numMonths, startMonth, curMonth, parentCallback}) => {
   
  const [myStartMonth, ] = useState(startMonth);
  const [myCurMonth, setMyCurMonth] = useState(parseInt(curMonth));
  const [arrayMonths, setArrayMonths] = useState<string[]>([]);

  useEffect(() => {
    const today = new Date();
    const month = today.getMonth() + parseInt(myStartMonth);
    const year = today.getFullYear();

    const tmpMonths = Array.from({length: numMonths}, (item, i) => {
      const myDate = new Date(year, month+i);
      const monthString = myDate.toLocaleString('en-US', {month: 'short'}) + "\n" + myDate.toLocaleString('en-US', {year: 'numeric'}) ;
      return monthString;
    });  

    setArrayMonths(tmpMonths);
  }, []);

  return (
    <div className="months-container">
      {arrayMonths?.length > 0 && arrayMonths.map((myMonth, index) => {
        return (
          <div 
            key={"month-"+index} 
            className={"month-item"+(myCurMonth === index ? "-selected":"")}
            onClick={() => {
              setMyCurMonth(index);
              parentCallback({ startMonth: myStartMonth, curMonth: myCurMonth });
          }}>
            {myMonth}
          </div>
        )
      })}
    </div>
  );
};

export default MonthSelector;
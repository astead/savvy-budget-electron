import React, { useEffect, useState } from 'react';
import 'react-edit-text/dist/index.css';

/*
TODO: 
 - Store CurMonth in local storage, so it persists?
 - Move left/right to other months.
*/

export const MonthSelector = ({ numMonths, startMonth, curMonth, parentCallback}) => {
   
  const [myStartMonth, ] = useState(startMonth);
  const [myCurMonth, setMyCurMonth] = useState(parseInt(curMonth));
  const [arrayMonths, setArrayMonths] = useState<string[]>([]);

  useEffect(() => {
    const today = new Date();
    const month = today.getMonth() + 1 + parseInt(myStartMonth);
    const year = today.getFullYear();

    const tmpMonths = Array.from({length: numMonths}, (item, i) => {
      const myDate = new Date(year, month+i-1);
      const monthString = 
        myDate.toLocaleString('en-US', {month: 'short'}) + "\n'" + 
        myDate.toLocaleString('en-US', {year: 'numeric'}).slice(2) ;
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
              parentCallback({ childStartMonth: myStartMonth, childCurMonth: index });
          }}>
            {myMonth}
          </div>
        )
      })}
    </div>
  );
};

export default MonthSelector;
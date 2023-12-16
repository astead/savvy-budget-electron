import React, { useEffect, useState } from 'react';
import 'react-edit-text/dist/index.css';import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons"

/*
TODO: 
 - Store CurMonth in local storage, so it persists?
*/

export const MonthSelector = ({ numMonths, startMonth, curIndex, parentCallback}) => {
   
  const [myStartMonth, setMyStartMonth] = useState(new Date(startMonth));
  const [myCurIndex, setMyCurIndex] = useState(parseInt(curIndex));
  const [arrayMonths, setArrayMonths] = useState<string[]>([]);

  const handleMonthAdjust = (i) => {
    const start = new Date(myStartMonth);
    const month = start.getMonth();
    const year = start.getFullYear();
    
    const tmpStart = new Date(year, month+i);
    let tmpCur = myCurIndex;
    if (i<0) {
      tmpCur = myCurIndex<numMonths-1 ? myCurIndex+1 : myCurIndex;
    } else {
      tmpCur = myCurIndex>0 ? myCurIndex-1 : myCurIndex;
    }
    setMyStartMonth(tmpStart)
    setMyCurIndex(tmpCur);
    parentCallback({ childStartMonth: tmpStart, childCurIndex: tmpCur });
  }

  useEffect(() => {
    const start = myStartMonth;
    const month = start.getMonth() + 1;
    const year = start.getFullYear();

    const tmpMonths = Array.from({length: numMonths}, (item, i) => {
      const myDate = new Date(year, month+i-1);
      const monthString = 
        myDate.toLocaleString('en-US', {month: 'short'}) + "\n'" + 
        myDate.toLocaleString('en-US', {year: 'numeric'}).slice(2) ;
      return monthString;
    });  

    setArrayMonths(tmpMonths);
  }, [myStartMonth]);

  return (
    <div className="months-container">
      <div className="month-arrow" onClick={() => {handleMonthAdjust(-1);}}>
        <FontAwesomeIcon icon={faChevronLeft} size="lg"/>
      </div>
      {arrayMonths?.length > 0 && arrayMonths.map((myMonth, index) => {
        return (
          <div 
            key={"month-"+index} 
            className={"month-item"+(myCurIndex === index ? "-selected":"")}
            onClick={() => {
              setMyCurIndex(index);
              parentCallback({ childStartMonth: myStartMonth, childCurIndex: index });
          }}>
            {myMonth}
          </div>
        )
      })}
      <div className="month-arrow" onClick={() => {handleMonthAdjust(1);}}>
        <FontAwesomeIcon icon={faChevronLeft} flip="horizontal" size="lg"/>
      </div>
    </div>
  );
};

export default MonthSelector;
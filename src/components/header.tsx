// header.js

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export const Header = ({currTab}) => {
  
  const [year, setYear] = useState((new Date()).getFullYear());
  const [month, setMonth] = useState((new Date()).getMonth());

  useEffect(() => {    
    const my_monthData_str = localStorage.getItem('transaction-month-data');
    let year = (new Date()).getFullYear();
    let month = (new Date()).getMonth();

    if (my_monthData_str?.length) {
      const my_monthData = JSON.parse(my_monthData_str);
      if (my_monthData) {
        let { childStartMonth, childCurIndex } = my_monthData;
        const child_start = new Date(childStartMonth);
        const child_month = child_start.getMonth();
        const child_year = child_start.getFullYear();
        let tmpDate = new Date(child_year, child_month + childCurIndex);
        year = tmpDate.getFullYear();
        month = tmpDate.getMonth();
      }
    }

    setYear(year);
    setMonth(month);
  }, []);

  return (
    <div className="NavBar">
      <Link to="/" className={currTab === "Home"?"menuLink menuLink-selected":"menuLink"}>Home</Link>
      <Link to="/Charts/-2" className={currTab === "Charts"?"menuLink menuLink-selected":"menuLink"}>Charts</Link>
      <Link to={"/Transactions/-3/0/"+year+"/"+month} className={currTab === "Transactions"?"menuLink menuLink-selected":"menuLink"}>Transactions</Link>
      <Link to="/Envelopes" className={currTab === "Envelopes"?"menuLink menuLink-selected":"menuLink"}>Envelopes</Link>
      <Link to="/Configure" className={currTab === "Configure"?"menuLink menuLink-selected":"menuLink"}>Configure</Link>
    </div>
  );
};

export default Header;
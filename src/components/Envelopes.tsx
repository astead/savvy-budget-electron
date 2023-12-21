import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { channels } from '../shared/constants.js'
import { EditableBudget } from '../helpers/EditableBudget.tsx';
import { MonthSelector } from '../helpers/MonthSelector.tsx'
import Moment from 'moment';
import { Link } from 'react-router-dom';
import BudgetBalanceModal from '../helpers/BudgetBalanceModal.tsx';

/*
  TODO:
  - Color based on how healthy the envelope is
*/

export const Envelopes: React.FC = () => {
  
  /* Month Selector code -------------------------------------------*/
  const [year, setYear] = useState((new Date()).getFullYear());
  const [month, setMonth] = useState((new Date()).getMonth());
  const [curMonth, setCurMonth] = useState(Moment(new Date(year, month)).format('YYYY-MM-DD'));
  const [myStartMonth, setMyStartMonth] = useState(new Date(year, month));
  const [myCurIndex, setMyCurIndex] = useState(0);
  const [gotMonthData, setGotMonthData] = useState(false);
  
  const monthSelectorCallback = ({ childStartMonth, childCurIndex }) => {    
    
    // Need to adjust our month/year to reflect the change
    const child_start = new Date(childStartMonth);
    const child_month = child_start.getMonth();
    const child_year = child_start.getFullYear();
    let tmpDate = new Date(child_year, child_month + childCurIndex);

    localStorage.setItem('envelopes-month-data', JSON.stringify({ childStartMonth, childCurIndex }));
    setMyStartMonth(childStartMonth);
    setMyCurIndex(childCurIndex);
    setYear(tmpDate.getFullYear());
    setMonth(tmpDate.getMonth());
    setCurMonth(Moment(tmpDate).format('YYYY-MM-DD'));
  };
  /* End Month Selector code ---------------------------------------*/
  
  interface BudgetNodeData {
    catID: number; 
    category: string;
    currBalance: number; 
    currBudget: number; 
    envID: number; 
    envelope: string;
    monthlyAvg: number; 
    prevActual: number;
    currActual: number; 
    prevBudget: number; 
  };

  interface EnvelopeList {
    envID: number; 
    category: string;
    envelope: string; 
  };

  function formatCurrency(currencyNumber:number) {
    return currencyNumber.toLocaleString('en-EN', {style: 'currency', currency: 'USD'});
  };

  function formatWholeCurrency(currencyNumber:number) {
    return currencyNumber.toLocaleString('en-EN', {style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  };

  const disp_date_label = (m, y) => {
    const myDate = new Date(y, m);
    const monthString = 
      myDate.toLocaleString('en-US', {month: 'short'}) + " '" + 
      myDate.toLocaleString('en-US', {year: 'numeric'}).slice(2) ;
    return monthString; 
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

  function monthDiff(d1, d2) {
    var months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    return months-1;
  };
  
  const [budgetData, setBudgetData] = useState<BudgetNodeData[]>([]);
  const [data, setData] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [loadedEnvelopes, setLoadedEnvelopes] = useState(false);
  const [loadedPrevBudget, setLoadedPrevBudget] = useState(false);
  const [loadedCurrBudget, setLoadedCurrBudget] = useState(false);
  const [loadedPrevActual, setLoadedPrevActual] = useState(false);
  const [loadedCurrBalance, setLoadedCurrBalance] = useState(false);
  const [loadedCurrActual, setLoadedCurrActual] = useState(false);
  const [loadedMonthlyAvg, setLoadedMonthlyAvg] = useState(false);

  const [curTotalBudgetIncome, setCurTotalBudgetIncome] = useState(0);
  const [curTotalBudgetSpending, setCurTotalBudgetSpending] = useState(0);
  const [curTotalActualUndefined, setCurTotalActualUndefined] = useState(0);
  
  const [transferEnvList, setTransferEnvList] = useState<EnvelopeList[]>([]);
  const [transferEnvListLoaded, setTransferEnvListLoaded] = useState(false);

  const load_envelope_list = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_ENV_LIST, {includeInactive: 1});

    // Receive the data
    ipcRenderer.on(channels.LIST_ENV_LIST, (arg) => {
      setTransferEnvList(arg as EnvelopeList[]);
      setTransferEnvListLoaded(true);

      ipcRenderer.removeAllListeners(channels.LIST_ENV_LIST);
    });
    
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_ENV_LIST);
    };
  };

  const load_PrevBudget = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_PREV_BUDGET, Moment(new Date(year, month-1)).format('YYYY-MM-DD'));

    // Receive the data
    ipcRenderer.on(channels.LIST_PREV_BUDGET, (arg) => {

      const tmpData = [...budgetData] as BudgetNodeData[]; 
    
      for (let i=0; i < arg.length; i++) {
        for (let j=0; j < tmpData.length; j++) {
          if (arg[i].envelopeID === tmpData[j].envID) {
            tmpData[j] = Object.assign(tmpData[j], { prevBudget: arg[i].txAmt });
          }
        }
      };
    
      setBudgetData(tmpData as BudgetNodeData[]); 
      setLoadedPrevBudget(true);     

      ipcRenderer.removeAllListeners(channels.LIST_PREV_BUDGET);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_PREV_BUDGET);
    };
  };

  const load_PrevActual = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_PREV_ACTUAL, Moment(new Date(year, month)).format('YYYY-MM-DD'));

    // Receive the data
    ipcRenderer.on(channels.LIST_PREV_ACTUAL, (arg) => {
      
      const tmpData = [...budgetData] as BudgetNodeData[]; 
    
      for (let i=0; i < arg.length; i++) {
        for (let j=0; j < tmpData.length; j++) {
          if (arg[i].envelopeID === tmpData[j].envID) {
            tmpData[j] = Object.assign(tmpData[j], { prevActual: arg[i].totalAmt });
          }
        }
      };
    
      setBudgetData(tmpData as BudgetNodeData[]); 
      setLoadedPrevActual(true);     

      ipcRenderer.removeAllListeners(channels.LIST_PREV_ACTUAL);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_PREV_ACTUAL);
    };
  };

  const load_CurrBalance = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_CURR_BALANCE);

    // Receive the data
    ipcRenderer.on(channels.LIST_CURR_BALANCE, (arg) => {
      
      const tmpData = [...budgetData] as BudgetNodeData[]; 
    
      for (let i=0; i < arg.length; i++) {
        for (let j=0; j < tmpData.length; j++) {
          if (arg[i].id === tmpData[j].envID) {
            tmpData[j] = Object.assign(tmpData[j], { currBalance: arg[i].balance });
          }
        }
      };
    
      setBudgetData(tmpData as BudgetNodeData[]); 
      setLoadedCurrBalance(true);     

      ipcRenderer.removeAllListeners(channels.LIST_CURR_BALANCE);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_CURR_BALANCE);
    };
  };

  const load_CurrBudget = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_CUR_BUDGET, Moment(new Date(year, month)).format('YYYY-MM-DD'));

    // Receive the data
    ipcRenderer.on(channels.LIST_CUR_BUDGET, (arg) => {
      
      const tmpData = [...budgetData] as BudgetNodeData[]; 
    
      // Go through the data and store it into our table array
      for (let i=0; i < arg.length; i++) {
        for (let j=0; j < tmpData.length; j++) {
          if (arg[i].envelopeID === tmpData[j].envID) {
            tmpData[j] = Object.assign(tmpData[j], { currBudget: arg[i].txAmt });
          }
        }
      };
    
      setBudgetData(tmpData as BudgetNodeData[]); 
      setLoadedCurrBudget(true);

      
      

      ipcRenderer.removeAllListeners(channels.LIST_CUR_BUDGET);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_CUR_BUDGET);
    };
  };

  const get_totals = () => {
    let myTotalBudgetIncome = 0;
    let myTotalBudgetSpending = 0;

    budgetData.map((n, i) => {
      if (n.category === "Income") {
        myTotalBudgetIncome += n.currBudget;

      } else {
        myTotalBudgetSpending += n.currBudget;
      }
    });
    
    setCurTotalBudgetIncome(myTotalBudgetIncome);
    setCurTotalBudgetSpending(myTotalBudgetSpending);
  }

  const load_CurrActual = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_CUR_ACTUAL, Moment(new Date(year, month+1)).format('YYYY-MM-DD'));

    // Receive the data
    ipcRenderer.on(channels.LIST_CUR_ACTUAL, (arg) => {
      
      let myTotalCurr = 0;
      const tmpData = [...budgetData] as BudgetNodeData[]; 
    
      for (let i=0; i < arg.length; i++) {
        let found = false;
        for (let j=0; j < tmpData.length; j++) {
          if (arg[i].envelopeID === tmpData[j].envID) {
            found = true;
            tmpData[j] = Object.assign(tmpData[j], { currActual: arg[i].totalAmt });
          }
        }
        if (!found) {
          myTotalCurr += arg[i].totalAmt;
        }
      };
    
      setCurTotalActualUndefined(myTotalCurr);
      setBudgetData(tmpData as BudgetNodeData[]); 
      setLoadedCurrActual(true);     

      ipcRenderer.removeAllListeners(channels.LIST_CUR_ACTUAL);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_CUR_ACTUAL);
    };
  };

  const load_MonthlyAvg = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_MONTHLY_AVG, Moment(new Date(year, month)).format('YYYY-MM-DD'));

    // Receive the data
    ipcRenderer.on(channels.LIST_MONTHLY_AVG, (arg) => {
      
      const tmpData = [...budgetData] as BudgetNodeData[]; 
      
      let firstDate = new Date();
      for (let i=0; i < arg.length; i++) {
        const tmpDate = new Date(arg[i].firstDate);
        if (tmpDate < firstDate) {
          firstDate = tmpDate;
        }
      }
      const curDate = new Date(year, month);
      const numMonths = monthDiff(firstDate, curDate);
      
      if (numMonths > 0) {
        for (let i=0; i < arg.length; i++) {
          for (let j=0; j < tmpData.length; j++) {
            if (arg[i].envelopeID === tmpData[j].envID) {
              const ttmAvg = arg[i].totalAmt / numMonths;
              tmpData[j] = Object.assign(tmpData[j], { monthlyAvg: ttmAvg });
            }
          }
        };
        
        setBudgetData(tmpData as BudgetNodeData[]); 
      }
      setLoadedMonthlyAvg(true);     

      ipcRenderer.removeAllListeners(channels.LIST_MONTHLY_AVG);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_MONTHLY_AVG);
    };
  };
  
  const load_initialEnvelopes = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_BUDGET_ENV);

    // Receive the data
    ipcRenderer.on(channels.LIST_BUDGET_ENV, (arg) => {
      
      const defaultValues = {
        prevBudget: 0,
        prevActual: 0,
        currBalance: 0,
        currBudget: 0,
        monthlyAvg: 0,
        currActual: 0,
      };

      for (let i=0; i < arg.length; i++) {
        arg[i] = {...arg[i], ...defaultValues} as BudgetNodeData;
      };
      const sortedData = Object.values(arg).sort(compare) as BudgetNodeData[];
      setBudgetData(sortedData as BudgetNodeData[]);
            
      ipcRenderer.removeAllListeners(channels.LIST_BUDGET_ENV);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_BUDGET_ENV);
    };
  }

  useEffect(() => {
    if (gotMonthData) {
      setLoadedEnvelopes(false);
    }
  }, [curMonth]);  

  useEffect(() => {
    get_totals();
    if (budgetData?.length > 0) {
       if (!loadedEnvelopes) {
        setLoadedEnvelopes(true);
      } else {
        setData({nodes:budgetData});
      }
    } else {
      load_initialEnvelopes();
    }
  }, [budgetData]);

  useEffect(() => {
    // Once we have the main table data, we can go get
    // the details and fill it in.
    if (loadedEnvelopes) {
      if (budgetData?.length > 0) {      
        load_CurrBudget();
      }
    } else {
      // We must be re-setting due to a month selection change.
      // Lets wipe this out and force it to start over.
      setLoaded(false);
      setLoadedPrevBudget(false);
      setLoadedCurrBudget(false);
      setLoadedPrevActual(false);
      setLoadedCurrBalance(false);
      setLoadedCurrActual(false);
      setLoadedMonthlyAvg(false);
      setBudgetData([]);
    }
  }, [loadedEnvelopes]);

  useEffect(() => {
    if (loadedCurrBudget) {      
      load_PrevBudget();
    }
  }, [loadedCurrBudget]);

  useEffect(() => {
    if (loadedPrevBudget) {      
      load_PrevActual();
    }
  }, [loadedPrevBudget]);

  useEffect(() => {
    if (loadedPrevActual) {      
      load_CurrBalance();
    }
  }, [loadedPrevActual]);

  useEffect(() => {
    if (loadedCurrBalance) {      
      load_CurrActual();
    }
  }, [loadedCurrBalance]);

  useEffect(() => {
    if (loadedCurrActual) {      
      load_MonthlyAvg();
    }
  }, [loadedCurrActual]);

  useEffect(() => {
    if (Object.keys(data).length > 0 &&
      loadedEnvelopes &&
      loadedCurrBudget &&
      loadedPrevBudget &&
      loadedPrevActual &&
      loadedCurrBalance &&
      loadedCurrActual &&
      loadedMonthlyAvg) {
      
      setLoaded(true);
    }
  }, [loadedMonthlyAvg]);

  useEffect(() => {
    // which month were we
    const my_monthData_str = localStorage.getItem('envelopes-month-data');
    if (my_monthData_str?.length) {
      const my_monthData = JSON.parse(my_monthData_str);
      if (my_monthData) {
        monthSelectorCallback(my_monthData);
      }
    }
    setGotMonthData(true);

    load_envelope_list();
    load_initialEnvelopes();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {<Header currTab="Envelopes"/>}
      </header>
      <div className="mainContent">
        {gotMonthData &&
          <MonthSelector numMonths="10" startMonth={myStartMonth} curIndex={myCurIndex} parentCallback={monthSelectorCallback} />
        }
        <br/>
        {loaded &&
          <div className="envelopeDataContainer">
            <div>
              <table className="BudgetTable" cellSpacing={0} cellPadding={0}>
              
                <thead className="BudgetTableHeader">
                  <tr className="BudgetTableHeaderRow">
                    <th className="BudgetTableHeaderCell">{' \nEnvelope'}</th>
                    <th className="BudgetTableHeaderCellCurr">{'Prev\nBudget'}</th>
                    <th className="BudgetTableHeaderCellCurr">{'Prev\nActual'}</th>
                    <th className="BudgetTableHeaderCellCurr">{'Curr\nBalance'}</th>
                    <th className="BudgetTableHeaderCellCurr">{disp_date_label(month, year) + '\nBudget'}</th>
                    <th className="BudgetTableHeaderCellCurr">{'Curr\nActual'}</th>
                    <th className="BudgetTableHeaderCellCurr">{'Monthly\nAvg'}</th>
                  </tr>
                </thead>
      
                <tbody className="BudgetTableBody">
                  {budgetData.map((item, index, myArray) => (
                    <React.Fragment key={index}>
                    { (index === 0 || (index > 0 && item.category !== myArray[index - 1].category)) && (
                      <tr key={'header-'+item.envID} className="BudgetTableGroupHeaderRow">
                        <td colSpan={7} className="BudgetTableGroupHeader">{item.category}</td>
                      </tr>
                    )}
                    <tr key={item.envID} className="BudgetTableRow">
                      <td className="BudgetTableCell">{item.envelope}</td>
                      <td className="BudgetTableCellCurr">{formatCurrency(item.prevBudget)}</td>
                      <td className="BudgetTableCellCurr">
                        <Link to={
                          "/Transactions" +
                          "/" + item.envID + 
                          "/" + new Date(year, month-1).getFullYear() + 
                          "/" + new Date(year, month-1).getMonth()}>
                          {formatCurrency(item.prevActual)}
                        </Link>
                      </td>
                      <td className="BudgetTableCellCurr">
                        <BudgetBalanceModal 
                          balanceAmt={item.currBalance}
                          category={item.category}
                          envelope={item.envelope}
                          envID={item.envID}
                          transferEnvList={transferEnvList}
                        />
                      </td>
                      <td className="BudgetTableCellInput">
                        <EditableBudget 
                          initialID={item.envID}
                          initialDate={curMonth}
                          initialValue={item.currBudget}/>
                      </td>
                      <td className="BudgetTableCellCurr">
                        <Link to={"/Transactions/" + item.envID + "/" + year + "/" + month}>
                          {formatCurrency(item.currActual)}
                        </Link>
                      </td>
                      <td className="BudgetTableCellCurr">
                        <Link to={"/Charts/" + item.envID}>
                          {formatCurrency(item.monthlyAvg)}
                        </Link>
                      </td>
                    </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="envelopeDataDiff">
              <div className="envelopeDataDiffFixed">
                <div className="envelopeDataDiffHeader">
                  <div>Budget Diff:</div>
                </div>
                
                <div className="envelopeDataDiffItem">
                  <div>Income:</div>
                  <div className="envelopeDataDiffItemCurr">
                    {formatWholeCurrency(curTotalBudgetIncome)}
                  </div>
                </div>
                
                <div className="envelopeDataDiffItem">
                  <div>Spending:</div>
                  <div className="envelopeDataDiffItemCurr">
                    {formatWholeCurrency(curTotalBudgetSpending)}
                  </div>
                </div>
                
                <div className="envelopeDataDiffItem">
                  <div>Diff:</div>
                  <div className="envelopeDataDiffItemCurr">
                    {formatWholeCurrency(curTotalBudgetIncome + curTotalBudgetSpending)}
                  </div>
                </div>

                <div>&nbsp;</div>
                
                <div className="envelopeDataDiffHeader">
                  <div>Actual:</div>
                </div>
                <div className="envelopeDataDiffItem">
                  <div>Missing:</div>
                  <div className="envelopeDataDiffItemCurr">
                    <Link to={"/Transactions/-2/" + year + "/" + month}>
                      {formatWholeCurrency(curTotalActualUndefined)}
                    </Link>
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  );
}
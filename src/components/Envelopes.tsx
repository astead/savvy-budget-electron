import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { channels } from '../shared/constants.js'
import { EditableBudget } from '../helpers/EditableBudget.tsx';
import { MonthSelector } from '../helpers/MonthSelector.tsx'
import Moment from 'moment';

/*
  TODO:
  - Add Current Actual
  - Click on envelope to list those transactions
  - Click on monthly average to go to trend chart
  - Color based on how healthy the envelope is
  - Click on curr balance to move envelope balance option
*/

export const Envelopes: React.FC = () => {
  
  /* Month Selector code -------------------------------------------*/
  const [year, setYear] = useState((new Date()).getFullYear());
  const [month, setMonth] = useState((new Date()).getMonth());
  const [curMonth, setCurMonth] = useState(Moment(new Date(year, month)).format('YYYY-MM-DD'));
  const [myStartMonth, setMyStartMonth] = useState(0);
  const [myCurMonth, setMyCurMonth] = useState(0);
  
  const monthSelectorCallback = ({ childStartMonth, childCurMonth }) => {
    
    // Need to adjust our month/year to reflect the change
    let tmpDate = new Date(year, month + childStartMonth + childCurMonth - myCurMonth);
        
    setMyStartMonth(childStartMonth);
    setMyCurMonth(childCurMonth);
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
    prevBudget: number; 
  };

  function formatCurrency(currencyNumber:number) {
    return currencyNumber.toLocaleString('en-EN', {style: 'currency', currency: 'USD'});
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
    return months <= 0 ? 0 : months;
  };
  
  const [budgetData, setBudgetData] = useState<BudgetNodeData[]>([]);
  const [data, setData] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [loadedEnvelopes, setLoadedEnvelopes] = useState(false);
  const [loadedPrevBudget, setLoadedPrevBudget] = useState(false);
  const [loadedCurrBudget, setLoadedCurrBudget] = useState(false);
  const [loadedPrevActual, setLoadedPrevActual] = useState(false);
  const [loadedCurrBalance, setLoadedCurrBalance] = useState(false);
  const [loadedMonthlyAvg, setLoadedMonthlyAvg] = useState(false);

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
    ipcRenderer.send(channels.GET_PREV_ACTUAL, Moment(new Date(year, month-1)).format('YYYY-MM-DD'));

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
      const numMonths = monthDiff(new Date(year, month), firstDate);

      for (let i=0; i < arg.length; i++) {
        for (let j=0; j < tmpData.length; j++) {
          if (arg[i].envelopeID === tmpData[j].envID) {
            const ttmAvg = arg[i].totalAmt / numMonths;
            tmpData[j] = Object.assign(tmpData[j], { monthlyAvg: ttmAvg });
          }
        }
      };
      
      setBudgetData(tmpData as BudgetNodeData[]); 
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
    setLoadedEnvelopes(false);
  }, [curMonth]);  

  useEffect(() => {
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
      load_MonthlyAvg();
    }
  }, [loadedCurrBalance]);

  useEffect(() => {
    if (Object.keys(data).length > 0 &&
      loadedEnvelopes &&
      loadedCurrBudget &&
      loadedPrevBudget &&
      loadedPrevActual &&
      loadedCurrBalance &&
      loadedMonthlyAvg) {
      
      setLoaded(true);
    }
  }, [loadedMonthlyAvg]);

  useEffect(() => {
    load_initialEnvelopes();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {<Header />}
      </header>
      <div>
        Envelopes<br/>
        <MonthSelector numMonths="10" startMonth={myStartMonth} curMonth={myCurMonth} parentCallback={monthSelectorCallback} />
        <br/>
        {loaded &&
          <table className="BudgetTable" cellSpacing={0} cellPadding={0}>
            
            <>
              <thead className="BudgetTableHeader">
                <tr className="BudgetTableHeaderRow">
                  <th className="BudgetTableHeaderCell">{' \n '}</th>
                  <th className="BudgetTableHeaderCell">{' \nEnvelope'}</th>
                  <th className="BudgetTableHeaderCellCurr">{'Prev\nBudget'}</th>
                  <th className="BudgetTableHeaderCellCurr">{'Prev\nActual'}</th>
                  <th className="BudgetTableHeaderCellCurr">{'Curr\nBalance'}</th>
                  <th className="BudgetTableHeaderCellCurr">{disp_date_label(month, year) + '\nBudget'}</th>
                  <th className="BudgetTableHeaderCellCurr">{'Monthly\nAvg'}</th>
                  <th className="BudgetTableHeaderCell">{' \n '}</th>
                </tr>
              </thead>
    
              <tbody className="BudgetTableBody">
                {budgetData.map((item, index, myArray) => (
                  <>
                  { (index === 0 || (index > 0 && item.category !== myArray[index - 1].category)) && (
                    <tr key={'header-'+item.envID} className="BudgetTableGroupHeaderRow">
                      <td colSpan={8} className="BudgetTableGroupHeader">{item.category}</td>
                    </tr>
                  )}
                  <tr key={item.envID} className="BudgetTableRow">
                    <td className="BudgetTableCellCurr">&nbsp;</td>
                    <td className="BudgetTableCell">{item.envelope}</td>
                    <td className="BudgetTableCellCurr">{formatCurrency(item.prevBudget)}</td>
                    <td className="BudgetTableCellCurr">{formatCurrency(item.prevActual)}</td>
                    <td className="BudgetTableCellCurr">{formatCurrency(item.currBalance)}</td>
                    <td className="BudgetTableCellInput">
                      <EditableBudget 
                        initialID={item.envID}
                        initialDate={curMonth}
                        initialValue={item.currBudget}/>
                    </td>
                    <td className="BudgetTableCellCurr">{formatCurrency(item.monthlyAvg)}</td>
                    <td className="BudgetTableCellCurr">&nbsp;</td>
                  </tr>
                  </>
                ))}
              </tbody>
            </>
          </table>
        }
      </div>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { channels } from '../shared/constants.js';
import { MonthSelector } from '../helpers/MonthSelector.tsx';
import { CategoryDropDown } from '../helpers/CategoryDropDown.tsx';
import { AccountDropDown } from '../helpers/AccountDropDown.tsx';
import { KeywordSave } from '../helpers/KeywordSave.tsx';
import Moment from 'moment';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faEyeSlash, faFileImport, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { useParams } from 'react-router';

import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

/*
 TODO:
  - add filter options:
    - date?
    - amount
  - add split transactions?
      https://fontawesome.com/icons/arrows-split-up-and-left?f=classic&s=solid&rt=flip-horizontal
  - modify description?
  - popup window to add notes, tags, etc and edit item
    https://mui.com/material-ui/react-modal/
  - import PLAID
  - somehow highlight if we could set a keyword
  - select multiple to delete?
*/

export const Transactions: React.FC = () => {
  
  const { in_envID, in_year, in_month } = useParams();
  
  interface TransactionNodeData {
    txID: number;
    catID: number; 
    envID: number; 
    category: string;
    envelope: string; 
    accountID: number;  
    account: string;
    txAmt: number;
    txDate: number;
    description: string;
    keywordEnvID: number;
    isDuplicate: number;
    isVisible: number;
  }
  interface EnvelopeList {
    envID: number; 
    category: string;
    envelope: string; 
  }
  interface AccountList {
    id: number; 
    refNumber: string;
    account: string;
  }
  
  function formatCurrency(currencyNumber:number) {
    return currencyNumber.toLocaleString('en-EN', {style: 'currency', currency: 'USD'});
  }
  
  // Filter by envelope
  const [filterEnvList, setFilterEnvList] = useState<EnvelopeList[]>([]);
  const [filterEnvListLoaded, setFilterEnvListLoaded] = useState(false);
  const [filterEnvID, setFilterEnvID] = useState(in_envID);
  const [filterEnvelopeName, setFilterEnvelopeName] = useState(null);

  // Filter by account
  const [filterAccList, setFilterAccList] = useState<AccountList[]>([]);
  const [filterAccListLoaded, setFilterAccListLoaded] = useState(false);
  const [filterAccID, setFilterAccID] = useState(-1);
  const [filterAccName, setFilterAccName] = useState(null);

  // Filter by description
  const [filterDesc, setFilterDesc] = useState('');
  

  const [txData, setTxData] = useState<TransactionNodeData[]>([]);
  const [envList, setEnvList] = useState<EnvelopeList[]>([]);
  const [envListLoaded, setEnvListLoaded] = useState(false);
  const [filename, setFilename] = useState('');
  

  /* Month Selector code -------------------------------------------*/
  const [year, setYear] = useState(in_year?parseInt(in_year):new Date().getFullYear());
  const [month, setMonth] = useState(in_month?parseInt(in_month):new Date().getMonth());
  const [curMonth, setCurMonth] = useState(Moment(new Date(year, month)).format('YYYY-MM-DD'));
  const [myStartMonth, setMyStartMonth] = useState(new Date(year, month-8));
  const [myCurIndex, setMyCurIndex] = useState(8);
  const [gotMonthData, setGotMonthData] = useState(false);
  
  const monthSelectorCallback = ({ childStartMonth, childCurIndex }) => {    
    
    // Need to adjust our month/year to reflect the change
    const child_start = new Date(childStartMonth);
    const child_month = child_start.getMonth();
    const child_year = child_start.getFullYear();
    let tmpDate = new Date(child_year, child_month + childCurIndex);

    localStorage.setItem('transaction-month-data', JSON.stringify({ childStartMonth, childCurIndex }));
    setMyStartMonth(childStartMonth);
    setMyCurIndex(childCurIndex);
    setYear(tmpDate.getFullYear());
    setMonth(tmpDate.getMonth());
    setCurMonth(Moment(tmpDate).format('YYYY-MM-DD'));
  }
  /* End Month Selector code ---------------------------------------*/

  const load_transactions = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_TX_DATA, 
      [ Moment(new Date(year, month+1)).format('YYYY-MM-DD'),
      filterEnvID,
      filterAccID,
      filterDesc ]);

    // Receive the data
    ipcRenderer.on(channels.LIST_TX_DATA, (arg) => {
      setTxData(arg as TransactionNodeData[]);
      ipcRenderer.removeAllListeners(channels.LIST_TX_DATA);
    });
    
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_TX_DATA);
    };
  }

  const load_envelope_list = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_ENV_LIST, {includeInactive: 1});

    // Receive the data
    ipcRenderer.on(channels.LIST_ENV_LIST, (arg) => {
      setEnvList([{
        envID: -1,
        category: "Undefined",
        envelope: "", 
      }, ...(arg as EnvelopeList[])]);
      setEnvListLoaded(true);

      setFilterEnvList([{
        envID: -3,
        category: "All",
        envelope: "", 
      },{
        envID: -2,
        category: "Not in current budget",
        envelope: "", 
      },{
        envID: -1,
        category: "Undefined",
        envelope: "", 
      }, ...(arg as EnvelopeList[])]);
      setFilterEnvListLoaded(true);
      ipcRenderer.removeAllListeners(channels.LIST_ENV_LIST);
    });
    
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_ENV_LIST);
    };
  }

  const load_account_list = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_ACCOUNTS);

    // Receive the data
    ipcRenderer.on(channels.LIST_ACCOUNTS, (arg) => {
      setFilterAccList([{
        id: -1,
        refNumber: '',
        account: "All", 
      }, ...(arg as AccountList[])]);
      setFilterAccListLoaded(true);
      ipcRenderer.removeAllListeners(channels.LIST_ACCOUNTS);
    });
    
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_ACCOUNTS);
    };
  }

  function nthIndex(str, pat, n){
    var L= str.length, i= -1;
    while(n-- && i++<L){
        i= str.indexOf(pat, i);
        if (i < 0) break;
    }
    return i;
  }

  const handleFilterEnvChange = ({id, new_value, new_text}) => {
    setFilterEnvID(new_value);
    setFilterEnvelopeName(new_text);
  };

  const handleFilterAccChange = ({id, new_value, new_text}) => {
    setFilterAccID(new_value);
    setFilterAccName(new_text);
  };

  const handleChange = ({id, new_value}) => {
    // Request we update the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.UPDATE_TX_ENV, [id, new_value]);
  };

  const toggleDuplicate = ({txID, isDuplicate}) => {
    // Request we update the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.SET_DUPLICATE, [txID, isDuplicate]);
  };

  const toggleVisibility = ({txID, isVisible}) => {
    // Request we update the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.SET_VISIBILITY, [txID, isVisible]);
  };

  const handleImport = async () => {
    const ipcRenderer = (window as any).ipcRenderer;
    const fs = ipcRenderer.require('fs')
    
    fs.readFile(filename, 'utf8', function(err, ofxString) {
      if (err) {
        console.log(err.message);
      } else {
        // Insert this transaction
        if (filename.toLowerCase().endsWith("qfx")) {
          ipcRenderer.send(channels.IMPORT_OFX, ofxString);
        }
        if (filename.toLowerCase().endsWith("csv")) {
          let account_string = '';
          let i = filename.lastIndexOf("/");
          let j = filename.lastIndexOf("\\");
          let short_filename = filename.substring((i===-1?j:i)+1);

          if (short_filename.toLowerCase().startsWith("sofi-")) {
            let separator = nthIndex(short_filename, "-", 3);
            if (separator > 0) {
              account_string = short_filename.substring(0,separator);
            }
          } else if (ofxString.includes("Statement Period Venmo Fees")) {
              account_string = "Venmo";
          } else {
            let PayPalHeader = '"Date","Time","TimeZone","Name","Type","Status","Currency","Gross","Fee","Net","From Email Address","To Email Address","Transaction ID","Shipping Address","Address Status","Item Title","Item ID","Shipping and Handling Amount","Insurance Amount","Sales Tax","Option 1 Name","Option 1 Value","Option 2 Name","Option 2 Value","Reference Txn ID","Invoice Number","Custom Number","Quantity","Receipt ID","Balance","Address Line 1","Address Line 2/District/Neighborhood","Town/City","State/Province/Region/County/Territory/Prefecture/Republic","Zip/Postal Code","Country","Contact Phone Number","Subject","Note","Country Code","Balance Impact"';
            let MintHeader = '"Date","Description","Original Description","Amount","Transaction Type","Category","Account Name","Labels","Notes"';
            if (ofxString.includes(PayPalHeader)) {
              account_string = "PayPal";
            } else if ((ofxString as string).startsWith(MintHeader)) {
              account_string = "Mint";
            }
          }

          ipcRenderer.send(channels.IMPORT_CSV, [account_string, ofxString]);
        }
        if (filename.toLowerCase().endsWith("txt")) {
          ipcRenderer.send(channels.IMPORT_CSV, ["mint tab", ofxString]);
        }
      }
    });
  }

  const save_file_name = (event) => {
    setFilename(event.target.files[0].path);
  }

  useEffect(() => {
    if (gotMonthData) {
      load_transactions();
    }
  }, [curMonth, filterEnvID, gotMonthData, filterAccID]);

  useEffect(() => {
    monthSelectorCallback({childStartMonth: new Date(year, month-8), childCurIndex: 8});
    setGotMonthData(true);
    
    load_envelope_list();
    load_account_list();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {<Header currTab="Transactions"/>}
      </header>
      <div className="mainContent">
        {gotMonthData &&
        <MonthSelector numMonths="10" startMonth={myStartMonth} curIndex={myCurIndex} parentCallback={monthSelectorCallback} />
        }
        <br/>
        <div className="import-container">
          <span>Import: </span>
          <input
              type="file"
              name="file"
              accept=".qfx,.csv,.txt"
              className="import-file"
              onChange={save_file_name}
          />
          <button 
            className='import'
            onClick={handleImport}>
              <FontAwesomeIcon icon={faFileImport} />
          </button>
        </div>
        {filterEnvListLoaded && filterAccListLoaded &&
          <Accordion>
          <AccordionSummary
            expandIcon={<FontAwesomeIcon icon={faChevronDown} />}
            aria-controls="filter-content"
            id="filter-header"
          >
            Filter
          </AccordionSummary>
          <AccordionDetails>
              <div className="import-container">
                <span>Envelope: </span>
                <CategoryDropDown 
                  id={-1}
                  envID={filterEnvID}
                  data={filterEnvList}
                  changeCallback={handleFilterEnvChange}
                />
              </div>
              <div className="import-container">
                <span>Account: </span>
                <AccountDropDown 
                  keyID={-1}
                  id={filterAccID}
                  data={filterAccList}
                  changeCallback={handleFilterAccChange}
                />
              </div>
              <div className="import-container">
                <span>Description: </span>
                <input
                  name="filterDesc"
                  value={filterDesc}
                  onChange={(e) => {
                    setFilterDesc(e.target.value);
                  }}
                  onBlur={() => {
                    if (gotMonthData) {
                      load_transactions();
                    }
                  }}
                />
              </div>
          </AccordionDetails>
        </Accordion>
        }
        <br/>
        {txData?.length > 0 && envListLoaded &&
          <table className="TransactionTable" cellSpacing={0} cellPadding={0}>
            <>
              <thead className="TransactionTableHeader">
                <tr className="TransactionTableHeaderRow">
                  <th className="TransactionTableHeaderCellDate">{'Date'}</th>
                  <th className="TransactionTableHeaderCellAccount">{'Account'}</th>
                  <th className="TransactionTableHeaderCell">{'Description'}</th>
                  <th className="TransactionTableHeaderCellCurr">{'Amount'}</th>
                  <th className="TransactionTableHeaderCell">{'Envelope'}</th>
                  <th className="TransactionTableHeaderCellCenter">{' KW '}</th>
                  <th className="TransactionTableHeaderCellCenter">{' Dup '}</th>
                  <th className="TransactionTableHeaderCellCenter">{' Vis '}</th>
                </tr>
              </thead>
    
              <tbody className="TransactionTableBody">
                {txData.map((item, index) => (
                  <tr key={index} className={"TransactionTableRow"+(item.isDuplicate === 1 ? "-duplicate":"")}>
                    <td className="TransactionTableCellDate">{Moment(item.txDate).format('M/D/YYYY')}</td>
                    <td className="TransactionTableCellAccount">{item.account}</td>
                    <td className="TransactionTableCell">{item.description}</td>
                    <td className="TransactionTableCellCurr">{formatCurrency(item.txAmt)}</td>
                    <td className="TransactionTableCellCenter">
                      <CategoryDropDown 
                        id={item.txID}
                        envID={item.envID}
                        data={envList}
                        changeCallback={handleChange}
                      />
                    </td>
                    <td className="TransactionTableCell">
                        <KeywordSave
                          txID={item.txID}
                          envID={item.envID}
                          description={item.description}
                          keywordEnvID={item.keywordEnvID} />
                    </td>
                    <td className="TransactionTableCell">
                      <div
                        onClick={() => {
                          toggleDuplicate({txID: item.txID, isDuplicate: (item.isDuplicate?0:1)});
                        }}
                        className={"ToggleDuplicate" + (item.isDuplicate?"-yes":"-no")}>
                        <FontAwesomeIcon icon={faCopy} />
                      </div>
                    </td>
                    <td className="TransactionTableCell">
                      <div
                        onClick={() => {
                          toggleVisibility({txID: item.txID, isVisible: (item.isVisible?0:1)});
                        }}
                        className={"ToggleVisibility" + (item.isVisible?"-no":"-yes")}>
                        <FontAwesomeIcon icon={faEyeSlash} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          </table>
        }
      </div>
    </div>
  );
}
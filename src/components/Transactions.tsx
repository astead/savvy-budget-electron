import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { channels } from '../shared/constants.js';
import { MonthSelector } from '../helpers/MonthSelector.tsx';
import { CategoryDropDown } from '../helpers/CategoryDropDown.tsx';
import { AccountDropDown } from '../helpers/AccountDropDown.tsx';
import { KeywordSave } from '../helpers/KeywordSave.tsx';
import Moment from 'moment';
import * as dayjs from 'dayjs'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faEyeSlash, faFileImport, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { useParams } from 'react-router';
import { Dayjs } from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Pagination from '@mui/material/Pagination';

import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import LinearProgress, { LinearProgressProps } from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

/*
 TODO:
  - add split transactions
      https://fontawesome.com/icons/arrows-split-up-and-left?f=classic&s=solid&rt=flip-horizontal
  - modify description?
  - popup window to add notes, tags, etc and edit item
    https://mui.com/material-ui/react-modal/
  - import PLAID
  - somehow highlight if we could set a keyword
  - select multiple to delete?
  - Don't think balance is getting modified on import.
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
  const [filterDescTemp, setFilterDescTemp] = useState('');

  // Filter by amount
  const [filterAmount, setFilterAmount] = useState('');
  const [filterAmountTemp, setFilterAmountTemp] = useState('');
  
  // Filter by Date
  const [filterStartDate, setFilterStartDate] = useState<Dayjs | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Dayjs | null>(null);

  // Transaction data
  const [txData, setTxData] = useState<TransactionNodeData[]>([]);
  
  // Category : Envelope data for drop down lists
  const [envList, setEnvList] = useState<EnvelopeList[]>([]);
  const [envListLoaded, setEnvListLoaded] = useState(false);
  
  // Import filename
  const [filename, setFilename] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = React.useState(0);
  
  // Variables for data table paging
  const [pagingCurPage, setPagingCurPage] = useState(1);
  const [pagingPerPage, setPagingPerPage] = useState(50);
  const [pagingNumPages, setPagingNumPages] = useState(1);
  const [pagingTotalRecords, setPagingTotalRecords] = useState(0);

  /* Month Selector code -------------------------------------------*/
  const [year, setYear] = useState(in_year?parseInt(in_year):new Date().getFullYear());
  const [month, setMonth] = useState(in_month?parseInt(in_month):new Date().getMonth());
  const [curMonth, setCurMonth] = useState(Moment(new Date(year, month)).format('YYYY-MM-DD'));
  const [myStartMonth, setMyStartMonth] = useState(new Date(year, month-8));
  const [myCurIndex, setMyCurIndex] = useState(8);
  const [gotMonthData, setGotMonthData] = useState(false);
  
  const monthSelectorCallback = ({ childStartMonth, childCurIndex, source }) => {    
    
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

    if (source === 1) {
      setFilterStartDate(dayjs(new Date(child_year, child_month + childCurIndex)));
      setFilterEndDate(dayjs(new Date(child_year, child_month + childCurIndex+1)));
    }
  }
  /* End Month Selector code ---------------------------------------*/

  const handlePageChange = (event, page: number) => {
    setPagingCurPage(page);
  };

  const handleNumPerPageChange = (event: SelectChangeEvent) => {
    setPagingPerPage(parseInt(event.target.value));
  };

  function LinearProgressWithLabel(props: LinearProgressProps & { value: number }) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: '100%', mr: 1 }}>
          <LinearProgress variant="determinate" {...props} />
        </Box>
        <Box sx={{ minWidth: 35 }}>
          <Typography variant="body2" color="text.secondary">{`${Math.round(
            props.value,
          )}%`}</Typography>
        </Box>
      </Box>
    );
  }  

  const load_transactions = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_TX_DATA, 
      [ filterStartDate?.format('YYYY-MM-DD'),
        filterEndDate?.format('YYYY-MM-DD'),
        filterEnvID,
        filterAccID,
        filterDesc,
        filterAmount ]);

    // Receive the data
    ipcRenderer.on(channels.LIST_TX_DATA, (arg) => {
      
      setTxData(arg as TransactionNodeData[]);
      const numtx = arg?.length;
      if (numtx > 0) {
        setPagingTotalRecords(numtx);
        setPagingNumPages(Math.ceil(numtx / pagingPerPage));
      } else {
        setPagingTotalRecords(0);
        setPagingNumPages(1);
      }
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
    localStorage.setItem(
      'transaction-filter-envID', 
      JSON.stringify({ filterEnvID: new_value})
    );
    setFilterEnvID(new_value);
    setFilterEnvelopeName(new_text);
  };

  const handleFilterAccChange = ({id, new_value, new_text}) => {
    localStorage.setItem(
      'transaction-filter-accID', 
      JSON.stringify({ filterAccID: new_value})
    );
    setFilterAccID(new_value);
    setFilterAccName(new_text);
  };

  const handleFilterDescChange = () => {
    localStorage.setItem(
      'transaction-filter-desc', 
      JSON.stringify({ filterDesc: filterDescTemp})
    );
    setFilterDesc(filterDescTemp);
  };  

  const handleFilterAmountChange = () => {
    localStorage.setItem(
      'transaction-filter-amount', 
      JSON.stringify({ filterAmount: filterAmountTemp})
    );
    setFilterAmount(filterAmountTemp);
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
            let MintHeader2 = 'Date,Description,Original Description,Amount,Transaction Type,Category,Account Name,Labels,Notes';
            if (ofxString.includes(PayPalHeader)) {
              account_string = "PayPal";
            } else if ((ofxString as string).startsWith(MintHeader) || (ofxString as string).startsWith(MintHeader2)) {
              account_string = "Mint";
            }
          }
          setUploading(true);
          ipcRenderer.send(channels.IMPORT_CSV, [account_string, ofxString]);
          
          // Listen for progress updates
          ipcRenderer.on(channels.UPLOAD_PROGRESS, (data) => {
            setProgress(data);
            if (data >= 100) {
              ipcRenderer.removeAllListeners(channels.UPLOAD_PROGRESS);
              setUploading(false);
            }
          });
          
          // Clean the listener after the component is dismounted
          return () => {
            ipcRenderer.removeAllListeners(channels.UPLOAD_PROGRESS);
          };
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
    // TODO: Not super happy with this, but it will do for now.
    const oldNumPer = Math.ceil(pagingTotalRecords / pagingNumPages);
    const oldItemIndex = (pagingCurPage-1) * oldNumPer;
    const newItemIndex = Math.ceil(oldItemIndex / pagingPerPage)
    setPagingCurPage(newItemIndex?newItemIndex:1);
    
    setPagingNumPages(Math.ceil(pagingTotalRecords / pagingPerPage));
  }, [pagingPerPage]);

  useEffect(() => {
    if (gotMonthData) {
      load_transactions();
    }
  }, [curMonth, filterEnvID, gotMonthData, filterAccID, 
      filterDesc, filterStartDate, filterEndDate, filterAmount]);

  useEffect(() => {
    const my_filter_startDate_str = localStorage.getItem('transaction-filter-startDate');
    if (my_filter_startDate_str?.length) {
      const my_filter_startDate = JSON.parse(my_filter_startDate_str);
      if (my_filter_startDate) {
        setFilterStartDate(dayjs(my_filter_startDate.filterStartDate));
      }
    }

    const my_filter_endDate_str = localStorage.getItem('transaction-filter-startDate');
    if (my_filter_endDate_str?.length) {
      const my_filter_endDate = JSON.parse(my_filter_endDate_str);
      if (my_filter_endDate) {
        setFilterEndDate(dayjs(my_filter_endDate.filterEndDate));
      }
    }

    const my_filter_envID_str = localStorage.getItem('transaction-filter-envID');
    if (my_filter_envID_str?.length) {
      const my_filter_envID = JSON.parse(my_filter_envID_str);
      if (my_filter_envID) {
        if (in_envID === "-3" && my_filter_envID.filterEnvID) {
          setFilterEnvID(my_filter_envID.filterEnvID);
        }
      }
    }
      
    const my_filter_accID_str = localStorage.getItem('transaction-filter-accID');
    if (my_filter_accID_str?.length) {
      const my_filter_accID = JSON.parse(my_filter_accID_str);
      if (my_filter_accID) {
        setFilterAccID(my_filter_accID.filterAccID);
      }
    }
      
    const my_filter_desc_str = localStorage.getItem('transaction-filter-desc');
    if (my_filter_desc_str?.length) {
      const my_filter_desc = JSON.parse(my_filter_desc_str);
      if (my_filter_desc) {
        setFilterDescTemp(my_filter_desc.filterDesc);
        setFilterDesc(my_filter_desc.filterDesc);
      }
    }
      
    const my_filter_amount_str = localStorage.getItem('transaction-filter-amount');
    if (my_filter_amount_str?.length) {
      const my_filter_amount = JSON.parse(my_filter_amount_str);
      if (my_filter_amount) {
        setFilterAmountTemp(my_filter_amount.filterAmount);
        setFilterAmount(my_filter_amount.filterAmount);
      }
    }
    
    monthSelectorCallback(
      { childStartMonth: new Date(year, month-8), 
        childCurIndex: 8,
        source: 0 }
    );
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
        <Accordion>
          <AccordionSummary
            expandIcon={<FontAwesomeIcon icon={faChevronDown} />}
            aria-controls="filter-content"
            id="filter-header"
            sx={{pl:1, pr:1, m:0, mt:-1}}
          >
            Import and Export
          </AccordionSummary>
          <AccordionDetails sx={{textAlign: 'left'}}>
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
            {uploading && 
              <Box sx={{ width: '100%' }}>
                <LinearProgressWithLabel value={progress} />
              </Box>
            }
          </AccordionDetails>
          </Accordion>
        {filterEnvListLoaded && filterAccListLoaded &&
          <Accordion>
          <AccordionSummary
            expandIcon={<FontAwesomeIcon icon={faChevronDown} />}
            aria-controls="filter-content"
            id="filter-header"
            sx={{pl:1, pr:1, m:0, mt:-1}}
          >
            Filter
          </AccordionSummary>
          <AccordionDetails>
            <table><tbody>
              <tr>
                <td className="txFilterLabelCell">
                  <span>Start Date: </span>
                </td>
                <td className="txFilterCell">
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      value={filterStartDate}
                      onChange={(newValue) => {
                        localStorage.setItem(
                          'transaction-filter-startDate', 
                          JSON.stringify({ filterStartDate: newValue?.format('YYYY-MM-DD')}));
                        setFilterStartDate(newValue);
                        
                        monthSelectorCallback(
                          { childStartMonth: newValue?.subtract(8,'month').toDate(), 
                            childCurIndex: 8, 
                            source: 0, }
                        );

                        if (filterEndDate && newValue && filterEndDate.diff(newValue) <= 0 ) {
                          setFilterEndDate(newValue?.add(1, 'day'));
                        }
                      }}
                      sx={{ width:250, pr:0 }}
                    />
                  </LocalizationProvider>
                </td>
                <td width="50"></td>
                <td className="txFilterLabelCell">
                  <span>Description: </span>
                </td>
                <td className="txFilterCell">
                  <input
                    name="filterDescTemp"
                    defaultValue={filterDescTemp}
                    onChange={(e) => {
                      setFilterDescTemp(e.target.value);
                    }}
                    onBlur={handleFilterDescChange}
                    className="filterDescription"
                  />
                </td>
              </tr>
              <tr>
                <td className="txFilterLabelCell">
                  <span>End Date: </span>
                </td>
                <td className="txFilterCell">
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      value={filterEndDate}
                      onChange={(newValue) => {
                        localStorage.setItem(
                          'transaction-filter-endDate', 
                          JSON.stringify({ filterEndDate: newValue}));
                        setFilterEndDate(newValue);
                      }}
                      sx={{ width:250}}
                    />
                  </LocalizationProvider>
                </td>
                <td></td>
                <td className="txFilterLabelCell">
                  <span>Amount: </span>
                </td>
                <td className="txFilterCell">
                  <input
                      name="filterAmountTemp"
                      defaultValue={filterAmountTemp}
                      onChange={(e) => {
                        setFilterAmountTemp(e.target.value);
                      }}
                      onBlur={handleFilterAmountChange}
                      className="filterAmount"
                    />
                </td>
              </tr>
              <tr>
                <td className="txFilterLabelCell">
                  <span>Envelope: </span>
                </td>
                <td className="txFilterCell">
                  <CategoryDropDown 
                    id={-1}
                    envID={filterEnvID}
                    data={filterEnvList}
                    changeCallback={handleFilterEnvChange}
                    className="filterEnvelope"
                  />
                </td>
              </tr>
              <tr>
                <td className="txFilterLabelCell">
                  <span>Account: </span>
                </td>
                <td className="txFilterCell">
                  <AccountDropDown 
                    keyID={-1}
                    id={filterAccID}
                    data={filterAccList}
                    changeCallback={handleFilterAccChange}
                    className="filterAccount"
                  />
                </td>
              </tr>
              </tbody></table>
          </AccordionDetails>
          </Accordion>
        }
        <br/>
        {txData?.length > 0 && envListLoaded &&
          <>
          <table className="TransactionTable" cellSpacing={0} cellPadding={0}>
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
              {
              //for (const [index, item] of txData.entries()) {
                txData.map((item, index) => (
                  index < (pagingCurPage * pagingPerPage) &&
                  index >= ((pagingCurPage-1) * pagingPerPage) &&
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
                        className="filterEnvelope"
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
                ))
              //}
              }
            </tbody>
            <tfoot>
              <tr className="TransactionTableHeaderRow">
                <td className="TransactionTableCellCurr" colSpan={3}>
                  (Only filtered data, but including all pages) Total:
                </td>
                <td className="TransactionTableCellCurr">{
                  formatCurrency(
                    txData.reduce((total, curItem, curIndex) => {
                      return total + curItem.txAmt;
                    }, 0)
                  )
                }</td>
                <td className="TransactionTableCellCurr" colSpan={4}></td>
              </tr>
            </tfoot>
          </table>
          <div className="PagingContainer"><table ><tbody><tr>
            <td>
            <span>Rows per page:</span>
            
            <Select
              id="dpaging-select-num-per-page"
              value={pagingPerPage.toString()}
              onChange={handleNumPerPageChange}
              sx={{ m:0, p:0, ml:1, lineHeight: 'normal', height: 30 }}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={30}>30</MenuItem>
              <MenuItem value={40}>40</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
              <MenuItem value={200}>200</MenuItem>
              <MenuItem value={300}>300</MenuItem>
            </Select>
            </td>
            <td >
              <Pagination
                count={pagingNumPages}
                variant="outlined"
                shape="rounded"
                onChange={handlePageChange}
                page={pagingCurPage}
                sx={{ width: 'fit-content'}}
              />
            </td>
            </tr></tbody></table></div>
          </>
        }
      </div>
    </div>
  );
}
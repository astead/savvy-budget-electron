import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { channels } from '../shared/constants.js';
import { DropDown } from '../helpers/DropDown.tsx';
import * as dayjs from 'dayjs'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileImport, faChevronDown, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { useParams } from 'react-router';
import { Dayjs } from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import LinearProgress, { LinearProgressProps } from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { TransactionTable } from './TransactionTable.tsx';
import { EditText } from 'react-edit-text';

/*
  TODO:
  - after uploading transactions, make sure table re-renders.
  - better way to pass in parameters?
  - better default parameter values (vs using -1, etc)
  - consolidate tx filter local storage
  - export transactions
*/

export const Transactions: React.FC = () => {
  
  const { in_catID, in_envID, in_force_date, in_year, in_month } = useParams();
 
  // Add new Transaction values
  const [newTxDate, setNewTxDate] = useState<Dayjs | null>(dayjs(new Date()));
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxAmountTemp, ] = useState('');
  const [newTxDesc, setNewTxDesc] = useState('');
  const [newTxDescTemp, ] = useState('');
  const [newTxAccList, setNewTxAccList] = useState<any[]>([]);
  const [newTxAccID, setNewTxAccID] = useState(-1);
  const [newTxEnvList, setNewTxEnvList] = useState<any[]>([]);
  const [newTxEnvID, setNewTxEnvID] = useState(-1);
  const [newTxEnvListLoaded, setNewTxEnvListLoaded] = useState(false);
  const [newTxAccListLoaded, setNewTxAccListLoaded] = useState(false);
  const [newError, setNewError] = useState("");

  // Filter by category
  const [filterCatList, setFilterCatList] = useState<any[]>([]);
  const [filterCatListLoaded, setFilterCatListLoaded] = useState(false);
  const [filterCatID, setFilterCatID] = useState(in_catID);

  // Filter by envelope
  const [filterEnvList, setFilterEnvList] = useState<any[]>([]);
  const [filterEnvListLoaded, setFilterEnvListLoaded] = useState(false);
  const [filterEnvID, setFilterEnvID] = useState(in_envID);

  // Filter by account
  const [filterAccList, setFilterAccList] = useState<any[]>([]);
  const [filterAccListLoaded, setFilterAccListLoaded] = useState(false);
  const [filterAccID, setFilterAccID] = useState("All");
  //const [filterAccName, setFilterAccName] = useState(null);

  // Filter by description
  const [filterDesc, setFilterDesc] = useState('');
  const [filterDescTemp, setFilterDescTemp] = useState('');

  // Filter by amount
  const [filterAmount, setFilterAmount] = useState('');
  const [filterAmountTemp, setFilterAmountTemp] = useState('');
  
  // Filter by Date
  const [filterStartDate, setFilterStartDate] = useState<Dayjs | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Dayjs | null>(null);

  // Category : Envelope data for drop down lists
  const [envList, setEnvList] = useState<any[]>([]);
  const [envListLoaded, setEnvListLoaded] = useState(false);
  
  // Import filename
  const [filename, setFilename] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = React.useState(0);

  // Transaction data
  const [txData, setTxData] = useState<any[]>([]);

  
  const [basicLoaded, setBasicLoaded] = useState(false);
  const [accLoaded, setAccLoaded] = useState(false);
  const [envLoaded, setEnvLoaded] = useState(false);

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

  function load_transactions() {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_TX_DATA, 
      [ filterStartDate?.format('YYYY-MM-DD'),
        filterEndDate?.format('YYYY-MM-DD'),
        filterCatID,
        filterEnvID,
        filterAccID,
        filterDesc,
        filterAmount ]);

    // Receive the data
    ipcRenderer.on(channels.LIST_TX_DATA, (arg) => {
      const tmpData = [...arg]; 
      setTxData(tmpData);
      
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
    ipcRenderer.send(channels.GET_CAT_ENV, {onlyActive: 0});

    // Receive the data
    ipcRenderer.on(channels.LIST_CAT_ENV, (arg) => {
      
      let firstID = -1;
      const tmpFilterEnvList = arg.map((item, index) => {
        if (index === 0) {
          firstID = item.envID;
        }
        return { id: item.envID, text: item.category + " : " + item.envelope };
      });
      
      const tmpFilterCatList = arg.reduce((acc, item) => {
        // Check if the category id already exists in the accumulator array
        const existingCategory = acc.find(category => category.id === item.catID);
      
        // If not, add the category to the accumulator
        if (!existingCategory) {
          acc.push({
            id: item.catID,
            text: item.category,
          });
        }
      
        return acc;
      }, []);

      setNewTxEnvList(tmpFilterEnvList);
      setNewTxEnvID(firstID);
      setNewTxEnvListLoaded(true);

      setEnvList([{ id: -1, text: "Undefined"}, ...(tmpFilterEnvList)]);
      setEnvListLoaded(true);

      setFilterEnvList([
        { id: -3, text: "All" },
        { id: -2, text: "Not in current budget" },
        { id: -1, text: "Undefined" }, ...(tmpFilterEnvList)
      ]);
      setFilterEnvListLoaded(true);

      setFilterCatList([
        { id: -1, text: "All" },
        ...(tmpFilterCatList)
      ]);
      setFilterCatListLoaded(true);
      setEnvLoaded(true);

      ipcRenderer.removeAllListeners(channels.LIST_CAT_ENV);
    });
    
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_CAT_ENV);
    };
  }

  const load_account_list = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_ACCOUNTS);

    // Receive the data
    ipcRenderer.on(channels.LIST_ACCOUNTS, (arg) => {
      const tmpFiltered = arg.filter((item) => {
        return (arg.find((i) => {
          return (i.account === item.account);
        }).id === item.id);
      });
      
      let firstID = -1;
      setNewTxAccList([...(tmpFiltered.map((i, index) => {
        if (index === 0) {
          firstID = i.id;
        }
        return { id: i.id, text: i.account }
      }))]);
      setNewTxAccID(firstID);
      setNewTxAccListLoaded(true);
      ipcRenderer.removeAllListeners(channels.LIST_ACCOUNTS);
    });
    
    // Signal we want to get data
    ipcRenderer.send(channels.GET_ACCOUNT_NAMES);

    // Receive the data
    ipcRenderer.on(channels.LIST_ACCOUNT_NAMES, (arg) => {
      setFilterAccList([{
        id: "All", text: "All"
      }, ...(arg.map((i) => {
        return { id: i.account, text: i.account }
      }))]);
      setFilterAccListLoaded(true);
      setAccLoaded(true);

      ipcRenderer.removeAllListeners(channels.LIST_ACCOUNT_NAMES);
    });
    
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_ACCOUNT_NAMES);
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

  const handleFilterCatChange = ({id, new_value, new_text}) => {
    localStorage.setItem(
      'transaction-filter-catID', 
      JSON.stringify({ filterCatID: new_value})
    );
    setFilterCatID(new_value);
  };

  const handleFilterEnvChange = ({id, new_value, new_text}) => {
    localStorage.setItem(
      'transaction-filter-envID', 
      JSON.stringify({ filterEnvID: new_value})
    );
    setFilterEnvID(new_value);
  };

  const handleFilterAccChange = ({id, new_value, new_text}) => {
    localStorage.setItem(
      'transaction-filter-accID', 
      JSON.stringify({ filterAccID: new_value})
    );
    setFilterAccID(new_value);
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

  function add_new_transaction() {
    let errorMsg = "";
    if (newTxAmount?.length === 0) {
      errorMsg += "You must enter an amount.  ";
    } else {
      if (isNaN(parseFloat(newTxAmount))) {
        errorMsg += "You must enter a valid amount. ";
      }
    }
    if (newTxDesc?.length === 0) {
      errorMsg += "You must enter a description. ";
    }
    if (errorMsg?.length > 0) {
      setNewError(errorMsg);
      return;
    }
    
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.ADD_TX, {
      txDate: newTxDate?.format('YYYY-MM-DD'),
      txAmt: newTxAmount,
      txEnvID: newTxEnvID,
      txAccID: newTxAccID,
      txDesc: newTxDesc
    });

    // Listen for progress updates
    ipcRenderer.on(channels.DONE_ADD_TX, (data) => {
      ipcRenderer.removeAllListeners(channels.DONE_ADD_TX);
      load_transactions();      
    });
    
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.DONE_ADD_TX);
    };
  }

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
          setProgress(0);
          setUploading(true);
          ipcRenderer.send(channels.IMPORT_CSV, [account_string, ofxString]);
          
          // Listen for progress updates
          ipcRenderer.on(channels.UPLOAD_PROGRESS, (data) => {
            setProgress(data);
            
            if (data >= 100) {
              ipcRenderer.removeAllListeners(channels.UPLOAD_PROGRESS);
              setUploading(false);
              load_transactions();
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
    if (basicLoaded && accLoaded && envLoaded) {
      load_transactions();
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCatID, filterEnvID, filterAccID, filterDesc,
      filterStartDate, filterEndDate, filterAmount,
      basicLoaded, accLoaded, envLoaded]);

  useEffect(() => {
    const my_filter_startDate_str = localStorage.getItem('transaction-filter-startDate');
    if (my_filter_startDate_str?.length) {
      const my_filter_startDate = JSON.parse(my_filter_startDate_str);
      if (my_filter_startDate?.filterStartDate) {
        const my_tmpStartDate = dayjs(my_filter_startDate.filterStartDate);
        setFilterStartDate(my_tmpStartDate);
        localStorage.setItem(
          'transaction-filter-startDate', 
          JSON.stringify({ filterStartDate: my_tmpStartDate?.format('YYYY-MM-DD')}));
        
      }
    }

    const my_filter_endDate_str = localStorage.getItem('transaction-filter-endDate');
    if (my_filter_endDate_str?.length) {
      const my_filter_endDate = JSON.parse(my_filter_endDate_str);
      if (my_filter_endDate?.filterEndDate) {
        const my_tmpEndDate = dayjs(my_filter_endDate.filterEndDate);
        setFilterEndDate(my_tmpEndDate);
        localStorage.setItem(
          'transaction-filter-endDate', 
          JSON.stringify({ filterEndDate: my_tmpEndDate?.format('YYYY-MM-DD')}));
      }
    }

    const my_filter_catID_str = localStorage.getItem('transaction-filter-catID');
    if (my_filter_catID_str?.length) {
      const my_filter_catID = JSON.parse(my_filter_catID_str);
      if (my_filter_catID) {
        if (in_catID === "-1" && my_filter_catID.filterCatID) {
          setFilterCatID(my_filter_catID.filterCatID);
        }
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

    if (in_force_date === "1" && in_year && in_month) {
      let tmpStartDate = dayjs(new Date(parseInt(in_year), parseInt(in_month)));
      let tmpEndDate = dayjs(new Date(parseInt(in_year), parseInt(in_month)+1,0));
      setFilterStartDate(tmpStartDate);
      setFilterEndDate(tmpEndDate);
      localStorage.setItem(
        'transaction-filter-startDate', 
        JSON.stringify({ filterStartDate: tmpStartDate?.format('YYYY-MM-DD')}));
      localStorage.setItem(
        'transaction-filter-endDate', 
        JSON.stringify({ filterEndDate: tmpEndDate?.format('YYYY-MM-DD')}));

      // If we came in from a link, we should clear out any other filters
      setFilterAccID("All");
      setFilterAmountTemp("");
      setFilterAmount("");
      setFilterDescTemp("");
      setFilterDesc("");
    }
    
    load_envelope_list();
    load_account_list();
    setBasicLoaded(true);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {<Header currTab="Transactions"/>}
      </header>
      <div className="mainContent">
        <Accordion>
          <AccordionSummary
            expandIcon={<FontAwesomeIcon icon={faChevronDown} />}
            aria-controls="filter-content"
            id="filter-header"
            sx={{pl:1, pr:1, m:0, mt:-1}}
          >
            Add / Import / Export
          </AccordionSummary>
          <AccordionDetails sx={{textAlign: 'left'}}>
            {newTxEnvListLoaded && newTxAccListLoaded &&
            <>
            <div>
              <span className="bold">Add Transaction:</span><br/>
              <table>
                <tbody>
                  <tr>
                    <td>Date:</td>
                    <td>Account:</td>
                    <td>Description:</td>
                    <td>Amount:</td>
                    <td>Envelope:</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        value={newTxDate}
                        onChange={(newValue) => setNewTxDate(newValue)}
                        sx={{ width:150, pr:0 }}
                        />
                      </LocalizationProvider>
                    </td>
                    <td>
                      <DropDown 
                          id={-1}
                          selectedID={newTxAccID}
                          optionData={newTxAccList}
                          changeCallback={({id, new_value, new_text}) => setNewTxAccID(new_value)}
                          className=""
                        />
                    </td>
                    <td>
                    <EditText
                      name="newTxDescTemp"
                      style={{
                        border: '1px solid #999', 
                        padding: '0px', 
                        margin: '0px', 
                        minHeight: '1.1rem', 
                        width: '250px',
                        height: '1.1rem'
                      }}
                      defaultValue={newTxDescTemp}
                      onSave={({name, value, previousValue}) => {
                        setNewTxDesc(value);
                        setNewError("");
                      }}
                      className={"editableText"}
                      inputClassName={"normalInput"}
                      />
                    </td>
                    <td>
                      <EditText
                        name="newTxAmountTemp"
                        style={{
                          border: '1px solid #999', 
                          padding: '0px', 
                          margin: '0px', 
                          minHeight: '1.1rem', 
                          width: '100px',
                          height: '1.1rem'
                        }}
                        defaultValue={newTxAmountTemp}
                        onSave={({name, value, previousValue}) => {
                          setNewTxAmount(value);
                          setNewError("");
                        }}
                        className={"Right editableText"}
                        inputClassName={"Right normalInput"}
                        />
                    </td>
                    <td>
                      <DropDown 
                          id={-1}
                          selectedID={newTxEnvID}
                          optionData={newTxEnvList}
                          changeCallback={({id, new_value, new_text}) => setNewTxEnvID(new_value)}
                          className=""
                        />
                    </td>
                    <td>
                      <button onClick={() => add_new_transaction()}>
                        <FontAwesomeIcon icon={faChevronRight} />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              {newError?.length > 0 &&
                <span className="Red">Error: {newError}</span>
              }
            </div>
            <br/>
            </>
            }
            <div>
              <span className="bold">Import Transactions:</span><br/>
              <input
                  type="file"
                  name="file"
                  accept=".qfx,.csv,.txt"
                  className="import-file"
                  onChange={save_file_name}
              />
              <button 
                onClick={handleImport}>
                  <FontAwesomeIcon icon={faFileImport} />
              </button>
              {uploading && 
                <Box sx={{ width: '100%' }}>
                  <LinearProgressWithLabel value={progress} />
                </Box>
              }
            </div>
          </AccordionDetails>
          </Accordion>
        {filterEnvListLoaded && filterAccListLoaded && filterCatListLoaded &&
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
                <td className="Right">
                  <span>Start Date: </span>
                </td>
                <td className="Left">
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      value={filterStartDate}
                      onChange={(newValue) => {
                        setFilterStartDate(newValue)
                        localStorage.setItem(
                          'transaction-filter-startDate', 
                          JSON.stringify({ filterStartDate: newValue?.format('YYYY-MM-DD')})
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
                <td className="Right">
                  <span>Description: </span>
                </td>
                <td className="Left">
                  <input
                    name="filterDescTemp"
                    defaultValue={filterDescTemp}
                    onChange={(e) => {
                      setFilterDescTemp(e.target.value);
                    }}
                    onBlur={handleFilterDescChange}
                    className="filterSize"
                  />
                </td>
              </tr>
              <tr>
                <td className="Right">
                  <span>End Date: </span>
                </td>
                <td className="Left">
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      value={filterEndDate}
                      onChange={(newValue) => {
                        localStorage.setItem(
                          'transaction-filter-endDate', 
                          JSON.stringify({ filterEndDate: newValue?.format('YYYY-MM-DD')})
                        );
                        if (newValue) {
                          setFilterEndDate(newValue);
                        }
                      }}
                      sx={{ width:250}}
                    />
                  </LocalizationProvider>
                </td>
                <td></td>
                <td className="Right">
                  <span>Amount: </span>
                </td>
                <td className="Left">
                  <input
                      name="filterAmountTemp"
                      defaultValue={filterAmountTemp}
                      onChange={(e) => {
                        setFilterAmountTemp(e.target.value);
                      }}
                      onBlur={handleFilterAmountChange}
                      className="filterSize"
                    />
                </td>
              </tr>
              <tr>
                <td className="Right">
                  <span>Category: </span>
                </td>
                <td className="Left">
                  <DropDown 
                    id={-1}
                    selectedID={filterCatID}
                    optionData={filterCatList}
                    changeCallback={handleFilterCatChange}
                    className="filterSize"
                  />
                </td>
                <td></td>
                <td className="Right">
                  <span>Envelope: </span>
                </td>
                <td className="Left">
                  <DropDown 
                    id={-1}
                    selectedID={filterEnvID}
                    optionData={filterEnvList}
                    changeCallback={handleFilterEnvChange}
                    className="filterSize"
                  />
                </td>
              </tr>
              <tr>
                <td className="Right">
                  <span>Account: </span>
                </td>
                <td className="Left">
                  <DropDown 
                    id={-1}
                    selectedID={filterAccID}
                    optionData={filterAccList}
                    changeCallback={handleFilterAccChange}
                    className="filterSize"
                  />
                </td>
              </tr>
              </tbody></table>
          </AccordionDetails>
          </Accordion>
        }
        <br/>
        {envListLoaded &&
          <TransactionTable
            data={txData}
            envList={envList}
            callback={load_transactions}
            />
        }
      </div>
    </div>
  );
}
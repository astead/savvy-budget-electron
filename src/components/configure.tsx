// configure.tsx

import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTrash, faChevronUp, faChevronDown, faReply, faReplyAll, faEyeSlash } from "@fortawesome/free-solid-svg-icons"
import { DragDropContext, Draggable } from "react-beautiful-dnd"
import { StrictModeDroppable as Droppable } from '../helpers/StrictModeDroppable.js';
import Moment from 'moment';
import NewCategory from '../helpers/NewCategory.tsx';
import EditableCategory from '../helpers/EditableCategory.tsx';
import EditableEnvelope from '../helpers/EditableEnvelope.tsx';
import EditableAccount from '../helpers/EditableAccount.tsx';
import EditableKeyword from '../helpers/EditableKeyword.tsx';
import NewEnvelope from '../helpers/NewEnvelope.tsx';
import { channels } from '../shared/constants.js';
import { CategoryDropDown } from '../helpers/CategoryDropDown.tsx';

import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';


import LinearProgress, { LinearProgressProps } from '@mui/material/LinearProgress';
import PlaidConfig from '../helpers/PlaidConfig.tsx';

/*
  TODO:
  - Show keyword conflicts? 
  - allow DB file to be on Google Drive?
    Not sure we if need to do anything special here if we have a local copy of the file.
  - Show more DB data? transaction dates, # transactions, # accounts?
*/
export const Configure = () => {

  interface EnvelopeList {
    envID: number; 
    category: string;
    envelope: string; 
  }

  interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    tabValue: number;
  }

  interface KeywordList {
    id: number;
    envelopeID: number;
    description: string;
    category: string;
    envelope: string;
  }

  function CustomTabPanel(props: TabPanelProps) {
    const { children, tabValue, index, ...other } = props;

    return (
      <div
        role="tabpanel"
        hidden={tabValue !== index}
        id={`simple-tabpanel-${index}`}
        aria-labelledby={`simple-tab-${index}`}
        {...other}
      >
        {tabValue === index && (
          <Box sx={{ pt: 3, m: 'auto' }}>
            <Typography component={"span"}>{children}</Typography>
          </Box>
        )}
      </div>
    );
  }

  function a11yProps(index: number) {
    return {
      id: `simple-tab-${index}`,
      'aria-controls': `simple-tabpanel-${index}`,
    };
  }

  const [catData, setCatData] = useState<any[]>([]);
  const [keywordData, setKeywordData] = useState<KeywordList[]>([]);
  const [accountData, setAccountData] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [envList, setEnvList] = useState<EnvelopeList[]>([]);
  const [envListLoaded, setEnvListLoaded] = useState(false);

  const [sortKeyword, setSortKeyword] = useState('10');  
  
  // Database filename
  const [databaseFile, setDatabaseFile] = useState('');
  const [databaseExists, setDatabaseExists] = useState(false);
  const [databaseVersion, setDatabaseVersion] = useState('');
 
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    localStorage.setItem('tabValue', JSON.stringify(newValue));
    setTabValue(newValue);
  };

  const categoryGroupBy = (data, key, label) => {
    return data.reduce(function(acc, item) {
      let groupKey = item[key];
      let groupLabel = item[label];
      if (!acc[groupKey]) {
        acc[groupKey] = {catID:groupKey, cat:groupLabel, items:[]};
      }
      acc[groupKey].items.push(item);
      return acc;
    }, {});
  };

  const compareCategory = (a,b) => {
    if (a.cat === 'Uncategorized' || b.cat === 'Uncategorized') {
      if (a.cat === 'Uncategorized' && b.cat !== 'Uncategorized') {
        return -1;
      }
      if (a.cat !== 'Uncategorized' && b.cat === 'Uncategorized') {
        return 1;
      }
      return 0;
    } else if (a.cat === 'Income' || b.cat === 'Income') {
      if (a.cat === 'Income' && b.cat !== 'Income') {
        return -1;
      }
      if (a.cat !== 'Income' && b.cat === 'Income') {
        return 1;
      }
      return 0;
    } else {
      if (a.cat < b.cat) {
        return -1;
      }
      if (a.cat > b.cat) {
        return 1;
      }
      return 0;
    }
  }

  const compareKeywordByEnvelope = (a,b) => {
    let return_value = 0;
    if (a.category === 'Uncategorized' || b.category === 'Uncategorized') {
      if (a.category === 'Uncategorized' && b.category !== 'Uncategorized') {
        return_value = -1;
      } else if (a.cat !== 'Uncategorized' && b.cat === 'Uncategorized') {
        return_value = 1;
      } else {
        return_value = 0;
      }
    } else if (a.category === 'Income' || b.category === 'Income') {
      if (a.category === 'Income' && b.category !== 'Income') {
        return_value = -1;
      } else if (a.category !== 'Income' && b.category === 'Income') {
        return_value = 1;
      } else {
        return_value = 0;
      }
    } else {
      if (a.category < b.category) {
        return_value = -1;
      } else if (a.category > b.category) {
        return_value = 1;
      } else {
        return_value = 0;
      }
    }

    if (return_value === 0) {
      if (a.envelope < b.envelope) {
        return_value = -1;
      } else if (a.envelope > b.envelope) {
        return_value = 1;
      } else {
        return_value = 0;
      }
    }
    return return_value;
  }

  const compareKeywordByEnvelopeDesc = (a,b) => {
    let return_value = 0;
    if (a.category === 'Uncategorized' || b.category === 'Uncategorized') {
      if (a.category === 'Uncategorized' && b.category !== 'Uncategorized') {
        return_value = 1;
      } else if (a.cat !== 'Uncategorized' && b.cat === 'Uncategorized') {
        return_value = -1;
      } else {
        return_value = 0;
      }
    } else if (a.category === 'Income' || b.category === 'Income') {
      if (a.category === 'Income' && b.category !== 'Income') {
        return_value = 1;
      } else if (a.category !== 'Income' && b.category === 'Income') {
        return_value = -1;
      } else {
        return_value = 0;
      }
    } else {
      if (a.category < b.category) {
        return_value = 1;
      } else if (a.category > b.category) {
        return_value = -1;
      } else {
        return_value = 0;
      }
    }

    if (return_value === 0) {
      if (a.envelope < b.envelope) {
        return_value = 1;
      } else if (a.envelope > b.envelope) {
        return_value = -1;
      } else {
        return_value = 0;
      }
    }
    return return_value;
  }
  
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

  const set_keyword_sort = (col, dir) => {
    setSortKeyword(col + dir);
  }

  const handleCategoryDelete = (id, name) => {
    // Don't allow deleting of Income or Uncategorized
    if (name === 'Income') {
      return;
    }
    if (name === 'Uncategorized') {
      return;
    }

    // Request we delete the category in the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.DEL_CATEGORY, id);
  };

  const handleEnvelopeDelete = (id) => {
    // Request we delete the category in the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.DEL_ENVELOPE, id);
  };

  const handleKeywordDelete = (id) => {
    // Request we delete the keyword in the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.DEL_KEYWORD, {id});
  };

  const handleKeywordSetAll = (id, force) => {
    // Request we set the keyword in the DB for undefined tx
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.SET_ALL_KEYWORD, {id, force});
  };

  const handleAccountDelete = (id, isActive) => {
    // Request we delete the account in the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.DEL_ACCOUNT, {id, value: (isActive===0?1:0)});
  };

  const handleEnvelopeChange = ({id, new_value}) => {
    // Request we update the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.UPDATE_KEYWORD_ENV, {id, new_value});
  };

  const handleOnDragEnd = (result) => {
    if (!result?.destination) return;
    
    if (result.source.droppableId !== result.destination.droppableId) {
      
      // Request we move the envelope in the DB
      const ipcRenderer = (window as any).ipcRenderer;
      ipcRenderer.send(channels.MOV_ENVELOPE,  [result.draggableId, result.destination.droppableId] );
    }
  };

  const check_database_file = (my_databaseFile) => {
    //console.log("Checking DB file: ", my_databaseFile);
    if (my_databaseFile?.length) {
      // Check if the database exists
      const ipcRenderer = (window as any).ipcRenderer;
      const fs = ipcRenderer.require('fs')
      
      if (fs.existsSync(my_databaseFile)) {
        //console.log("file exists");
        setDatabaseFile(my_databaseFile);
        setDatabaseExists(true);

        // Save this in local storage
        localStorage.setItem('databaseFile', JSON.stringify(my_databaseFile));
        const ipcRenderer = (window as any).ipcRenderer;
        ipcRenderer.send(channels.SET_DB_PATH, my_databaseFile);

        get_db_version();
      } else {
        //console.log("file does not exist");
        setDatabaseExists(false);
        setDatabaseVersion('');
      }
    }
  }

  const get_db_version = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_DB_VER);

    // Receive the data
    ipcRenderer.on(channels.LIST_DB_VER, (arg) => {
      if (arg?.length > 0) {
        setDatabaseVersion(arg[0].version);
      } else {
        setDatabaseVersion('');
      }

      ipcRenderer.removeAllListeners(channels.LIST_DB_VER);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_DB_VER);
    };
  }

  const load_cats_and_envs = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_CAT_ENV);

    // Receive the data
    ipcRenderer.on(channels.LIST_CAT_ENV, (arg) => {
      const groupedData = categoryGroupBy(arg, 'catID', 'category');
      const sortedData = Object.values(groupedData).sort(compareCategory);

      setCatData(sortedData);
      setLoaded(true);

      ipcRenderer.removeAllListeners(channels.LIST_CAT_ENV);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_CAT_ENV);
    };
  }

  const load_keywords = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_KEYWORDS);

    // Receive the data
    ipcRenderer.on(channels.LIST_KEYWORDS, (arg) => {
      setKeywordData([...sort_keyword_array(arg)]);
      ipcRenderer.removeAllListeners(channels.LIST_KEYWORDS);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_KEYWORDS);
    };
  }

  const sort_keyword_array = (arr) => {
    let sortValue = sortKeyword[0];
    let sortDir = sortKeyword[1];

    let tmpArr = arr as KeywordList[];
    
    if (sortValue === '0') {
      if (sortDir === '0') {
        tmpArr.sort((a, b) => a.description > b.description ? 1 : -1)
      } else {
        tmpArr.sort((a, b) => a.description < b.description ? 1 : -1)
      }
    } else {
      if (sortDir === '0') {
        tmpArr.sort(compareKeywordByEnvelope);
      } else {
        tmpArr.sort(compareKeywordByEnvelopeDesc);
      }
    }
    return tmpArr;
  }

  const load_accounts = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_ACCOUNTS);

    // Receive the data
    ipcRenderer.on(channels.LIST_ACCOUNTS, (arg) => {
      setAccountData(arg);
      ipcRenderer.removeAllListeners(channels.LIST_ACCOUNTS);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_ACCOUNTS);
    };
  }

  const load_envelope_list = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_ENV_LIST, {includeInactive: 0});

    // Receive the data
    ipcRenderer.on(channels.LIST_ENV_LIST, (arg) => {
      setEnvList(arg as EnvelopeList[]);
      setEnvListLoaded(true);
      ipcRenderer.removeAllListeners(channels.LIST_ENV_LIST);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_ENV_LIST);
    };
  }

  useEffect(() => {
    setKeywordData([...sort_keyword_array(keywordData)]);
  }, [sortKeyword]);

  useEffect(() => {
    if (!loaded) {

      const databaseFile_str = localStorage.getItem('databaseFile');
      if (databaseFile_str?.length) {
        const my_databaseFile = JSON.parse(databaseFile_str);
        if (my_databaseFile) {
          // Check if the database exists
          const ipcRenderer = (window as any).ipcRenderer;
          const fs = ipcRenderer.require('fs')
          
          if (fs.existsSync(my_databaseFile)) {
            setDatabaseFile(my_databaseFile);
            setDatabaseExists(true);
            get_db_version();
          } else {

          }
        }
      }

      // which tab were we on?
      const my_tabValue_str = localStorage.getItem('tabValue');
      if (my_tabValue_str?.length) {
        const my_tabValue = JSON.parse(my_tabValue_str);
        if (my_tabValue) {
          setTabValue(my_tabValue);
        }
      }

      load_cats_and_envs();
      load_envelope_list();
      load_keywords();
      load_accounts();
    }
  }, [databaseFile]);

  let category_content;
  if (catData) {
    category_content = (
      <>
      <NewCategory/>
      <DragDropContext onDragEnd={handleOnDragEnd}>
        {catData.map((category, index) => {
          const { catID, cat:cat_name, items } = category;
          
          return (
            <Droppable droppableId={catID.toString()} key={index}>
              {(provided) => (
                <section  {...provided.droppableProps} ref={provided.innerRef}>
                  <article className="cat">
                    <article
                      className={
                        cat_name === 'Income'?'cat ci ci-income':
                        cat_name === 'Uncategorized'?'cat ci ci-uncategorized':'cat ci'}>
                      <div className="cat">
                        {(cat_name === 'Income' || cat_name === 'Uncategorized')?
                          <div className="cat">{cat_name}</div>
                          :
                          <EditableCategory
                            initialID={catID.toString()}
                            initialName={cat_name} />
                        }
                      </div>
                      <NewEnvelope id={catID} />
                      {(cat_name !== 'Income' && cat_name !== 'Uncategorized')?
                        <button 
                          className="trash"
                          onClick={() => handleCategoryDelete( catID, cat_name )}>
                            <FontAwesomeIcon icon={faTrash} />
                        </button>
                        :''
                      }
                    </article>
                    
                    <article className="cat env">
                    {
                      items.map((env, index2) => {
                        return (
                          (env.envID) &&
                          <Draggable key={index2} draggableId={env.envID.toString()} index={index2}>
                            {(provided) => (
                              <article className="cat env ei-container" {...provided.draggableProps} {...provided.dragHandleProps} ref={provided.innerRef}>
                                <article className="cat env ei-container ei">
                                  <div className="cat">
                                    <EditableEnvelope
                                      initialID={env.envID.toString()}
                                      initialName={env.envelope} />
                                  </div>
                                  <button className="trash" onClick={() => handleEnvelopeDelete( env.envID )}>
                                      <FontAwesomeIcon icon={faTrash} />
                                  </button>
                                </article>
                              </article>
                          )}
                          </Draggable>
                        )
                      })
                    }
                    </article>
                  </article>
                  { provided.placeholder }
                </section>
              )}
            </Droppable>
          );
        })}   
      </DragDropContext>
      </>
    )
  }

  let keyword_content;
  if (keywordData && envListLoaded) {
    keyword_content = (
      
      <table className="Table" cellSpacing={0} cellPadding={0}>
        <>
        <thead>
          <tr className="Table THR">
            <th className="Table THR THRC THRCClickable" onClick={() => {
              set_keyword_sort('0', (sortKeyword[0] === '0')?((sortKeyword[1] === '0')?('1'):('0')):('0'));
            }}>
              {'Keyword'}
              { sortKeyword === '00' &&
                 <FontAwesomeIcon icon={faChevronUp} className="sortIcon" />
              }
              { sortKeyword=== '01' &&
                 <FontAwesomeIcon icon={faChevronDown} className="sortIcon" />
              }
            </th>
            <th className="Table THR THRC THRCClickable" onClick={() => {
              set_keyword_sort('1', (sortKeyword[0] === '1')?((sortKeyword[1] === '0')?('1'):('0')):('0'));
            }}>
              {'Envelope'}
              { sortKeyword === '10' &&
                 <FontAwesomeIcon icon={faChevronUp} className="sortIcon" />
              }
              { sortKeyword === '11' &&
                 <FontAwesomeIcon icon={faChevronDown} className="sortIcon" />
              }
            </th>
            <th className="Table THR THRC">{' '}</th>
            <th className="Table THR THRC">{'Set'}</th>
            <th className="Table THR THRC">{'Force'}</th>
          </tr>
        </thead>

        <tbody>
          {
            keywordData.map((kw, index) => {
              const { id, envelopeID, description } = kw;
              return (
                <tr key={index} className="Table">
                  
                  <td className="Table TC Left">
                    <EditableKeyword
                      initialID={id.toString()}
                      initialDescription={description} />
                  </td>
                  <td className="Table TC">
                    <CategoryDropDown 
                      id={id}
                      envID={envelopeID}
                      data={envList}
                      changeCallback={handleEnvelopeChange}
                      className={envelopeID === -1 ? "envelopeDropDown-undefined":""}
                    />
                  </td>
                  <td className="Table TC">
                  <button 
                    className="trash"
                    onClick={() => handleKeywordDelete(id)}>
                      <FontAwesomeIcon icon={faTrash} />
                  </button>
                  </td>
                  <td className="Table TC">
                    <button 
                      onClick={() => handleKeywordSetAll(id, 0)}>
                        <FontAwesomeIcon icon={faReply} flip="horizontal" />
                    </button>
                  </td>
                  <td className="Table TC">
                    <button 
                      onClick={() => handleKeywordSetAll(id, 1)}>
                        <FontAwesomeIcon icon={faReplyAll} flip="horizontal" />
                    </button>
                  </td>
                </tr>
              );
            }
          )}
        </tbody>
        </>
      </table>
    )
  }

  let account_content;
  if (accountData) {
    account_content = (
      
      <table className="Table" cellSpacing={0} cellPadding={0}>
        <>
        <thead>
          <tr className="Table THR">
            <th className="Table THR THRC">{'Account'}</th>
            <th className="Table THR THRC">{'Name'}</th>
            <th className="Table THR THRC">{'Last Transaction'}</th>
            <th className="Table THR THRC">{' '}</th>
          </tr>
        </thead>

        <tbody>
          {
            accountData.map((acc, index) => {
              const { id, refNumber, account, isActive, lastTx } = acc;
              
                return (
              
                  <tr key={index} className="Table">
                    
                    <td className="Table TC Left">{refNumber}</td>
                    <td className="Table TC Left">
                      <EditableAccount
                        initialID={id.toString()}
                        initialName={account} />
                    </td>
                    <td className="Table TC Right">{lastTx && Moment(lastTx).format('M/D/YYYY')}</td>
                    <td className="Table TC">
                    <div 
                      className={"ToggleVisibility" + (isActive?"-no":"-yes")}
                      onClick={() => handleAccountDelete(id, isActive)}>
                        <FontAwesomeIcon icon={faEyeSlash} />
                    </div>
                    </td>
                  </tr>

                );
            }
          )}
      
        </tbody>
        </>
      </table>
    )
  }

  let database_content = (
    <>
      {databaseFile &&
        <span>Database: {databaseFile}</span>
      }
      {databaseFile && !databaseExists &&
        <>
          <br/>
          <span>The database file does not exist.</span>
        </>
      }
      {databaseFile && databaseExists && !databaseVersion &&
        <>
          <br/>
          <span>Database appears to be corrupted</span><br/>
        </>
      }
      {databaseFile && databaseExists && databaseVersion &&
        <>
          <br/>
          <span>Database version: {databaseVersion}</span><br/>
        </>
      }
      {!databaseFile && 
        <span>Select database file:</span>
      }
      {databaseFile && 
        <>
          <br/><br/>
          <span>Select a different database file:</span>
        </>
      }
      <input
          type="file"
          name="file"
          className="import-file"
          onChange={(e) => {
            if (e.target.files) {
              setLoaded(false);
              check_database_file(e.target.files[0].path);
            }
          }}          
      />
      <br/><br/>
      <span>Create a new database file:</span>
      <button 
        className="textButton"
        onClick={() => {
          const ipcRenderer = (window as any).ipcRenderer;
          ipcRenderer.send(channels.CREATE_DB);

          // Receive the new filename
          ipcRenderer.on(channels.LIST_NEW_DB_FILENAME, (arg) => {
            if (arg?.length > 0) {
              setLoaded(false);
              check_database_file(arg);
            }

            ipcRenderer.removeAllListeners(channels.LIST_NEW_DB_FILENAME);
          });

          // Clean the listener after the component is dismounted
          return () => {
            ipcRenderer.removeAllListeners(channels.LIST_NEW_DB_FILENAME);
          };
        }}>
          Create New
      </button>
    </>
  );
  
  
  
  

  let plaid_config = (
      <PlaidConfig />
  );
  
 

  return (
    <div className="App">
      <header className="App-header">
        {<Header currTab="Configure"/>}
      </header>
      <div className="mainContent">
          <Box 
            sx={{ 
              width: '800', 
              bgcolor: 'lightgray', 
              borderBottom: 1, 
              borderColor: 'divider',
            }}
          >
            <Tabs 
              value={tabValue}
              onChange={handleTabChange}
              aria-label="basic tabs example"
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"  sx={{ padding: 0, margin: 0, height: 30, minHeight:30, width: 800}}>
              <Tab label="Categories" {...a11yProps(0)} sx={{ padding: 0, margin: 0, height: 30, minHeight:30 }} />
              <Tab label="Key Words" {...a11yProps(1)} sx={{ padding: 0, margin: 0, height: 30, minHeight:30 }} />
              <Tab label="Accounts" {...a11yProps(2)} sx={{ padding: 0, margin: 0, height: 30, minHeight:30 }} />
              <Tab label="Database" {...a11yProps(3)} sx={{ padding: 0, margin: 0, height: 30, minHeight:30 }} />
              <Tab label="PLAID" {...a11yProps(4)} sx={{ padding: 0, margin: 0, height: 30, minHeight:30 }} />
            </Tabs>
          </Box>
          <CustomTabPanel tabValue={tabValue} index={0}>
            {category_content}
          </CustomTabPanel>
          <CustomTabPanel tabValue={tabValue} index={1}>
            {keyword_content}
          </CustomTabPanel>
          <CustomTabPanel tabValue={tabValue} index={2}>
            {account_content}
          </CustomTabPanel>
          <CustomTabPanel tabValue={tabValue} index={3}>
            {database_content}
          </CustomTabPanel>
          <CustomTabPanel tabValue={tabValue} index={4}>
            {plaid_config}
          </CustomTabPanel>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { channels } from '../shared/constants.js';
import { DropDown } from '../helpers/DropDown.tsx';
import { KeywordSave } from '../helpers/KeywordSave.tsx';
import * as dayjs from 'dayjs';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faEyeSlash, faTrash } from "@fortawesome/free-solid-svg-icons";
import SplitTransactionModal from './SplitTransactionModal.tsx';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Pagination from '@mui/material/Pagination';
import { EditText } from 'react-edit-text';
import { EditDate } from '../helpers/EditDate.tsx';

/*
 TODO:
  - modify date?
  - popup window to add notes, tags, etc and edit item
*/

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
  isSplit: number;
}

export const TransactionTable = ({data, envList, callback}) => {  

  // Other variables
  const [changeAllEnvID, setChangeAllEnvID] = useState(-1);

  // Transaction data
  const [txData, setTxData] = useState<TransactionNodeData[]>(data);
  const [isChecked, setIsChecked] = useState<any[]>([]);
  const [isAllChecked, setIsAllChecked] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  
  // Variables for data table paging
  const [pagingCurPage, setPagingCurPage] = useState(1);
  const [pagingPerPage, setPagingPerPage] = useState(50);
  const [pagingNumPages, setPagingNumPages] = useState(1);
  const [pagingTotalRecords, setPagingTotalRecords] = useState(0);

  function formatCurrency(currencyNumber:number) {
    return currencyNumber.toLocaleString('en-EN', {style: 'currency', currency: 'USD'});
  }

  const handlePageChange = (event, page: number) => {
    setPagingCurPage(page);
  };

  const handleNumPerPageChange = (event: SelectChangeEvent) => {
    setPagingPerPage(parseInt(event.target.value));
  };

  const set_checkbox_array = (myArr) => {
    // Set our array of checkboxes
    let check_list = myArr.map((item, index) => {
      return {txID: item.txID, isChecked: false, index: index};
    });
    setIsChecked([...check_list]);
  }

  const look_for_dups = () => {
    let filtered_nodes = txData.filter((item, index) => {
      return (index < (pagingCurPage * pagingPerPage) &&
      index >= ((pagingCurPage-1) * pagingPerPage));
    });
    let found = false;
    filtered_nodes.forEach((item, index, myArr) => {
      if (item.isDuplicate) {
        found = true;
        isChecked.find(n => n.txID === item.txID).isChecked = true;
      }
    });
    if (found) {
      setIsChecked([...isChecked]);
    } else {
      filtered_nodes.forEach((item, index, myArr) => {
        if (myArr.find((item2, index2) => {
          return (item.txID !== item2.txID &&
          item.txAmt === item2.txAmt &&
          item.txDate === item2.txDate &&
          item.description === item2.description &&
          index2 > index);
          })) {
            isChecked.find(n => n.txID === item.txID).isChecked = true;
        }
      });
      setIsChecked([...isChecked]);
    }
  }

  const look_for_invisible = () => {
    let filtered_nodes = txData.filter((item, index) => {
      return (index < (pagingCurPage * pagingPerPage) &&
      index >= ((pagingCurPage-1) * pagingPerPage));
    });
    filtered_nodes.forEach((item, index, myArr) => {
      if (!item.isVisible) {
        isChecked.find(n => n.txID === item.txID).isChecked = true;
      }
    });
    setIsChecked([...isChecked]);
  }

  const delete_checked_transactions = () => {
    let filtered_nodes = isChecked.filter((item) => item.isChecked);
    // Signal we want to del data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.DEL_TX_LIST, {del_tx_list: filtered_nodes});
    
    // Wait till we are done
    ipcRenderer.on(channels.DONE_DEL_TX_LIST, () => {
      setIsAllChecked(false);
      callback();      
      ipcRenderer.removeAllListeners(channels.DONE_DEL_TX_LIST);
    });
    
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.DONE_DEL_TX_LIST);
    };
  } 
  
  const handleChangeAll = ({id, new_value}) => {
    setChangeAllEnvID(new_value);
    let filtered_nodes = isChecked.filter((item) => item.isChecked);
    
    filtered_nodes.forEach((item) => {
      txData[item.index].envID = new_value;
    });
    setIsAllChecked(false);

    // Reset all checkboxes
    setIsAllChecked(false);
    isChecked.forEach((i) => i.isChecked = false);
    setIsChecked([...isChecked]);

    // Reset the main data array
    setTxData([...txData]);

    // Signal we want to del data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.UPDATE_TX_ENV_LIST, {new_value, filtered_nodes});
    
    // Wait till we are done
    ipcRenderer.on(channels.DONE_UPDATE_TX_ENV_LIST, () => {
      // Reset the drop down to the default
      setChangeAllEnvID(-1);

      // Probably don't need to call the callback since we 
      // already made the changes in the local data array above.
      callback();
      ipcRenderer.removeAllListeners(channels.DONE_UPDATE_TX_ENV_LIST);
    });
    
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.DONE_UPDATE_TX_ENV_LIST);
    };

  }; 
  
  const handleTxEnvChange = ({id, new_value, new_text}) => {
    // Request we update the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.UPDATE_TX_ENV, { txID: id, envID: new_value });
    
    // Wait till we are done
    ipcRenderer.on(channels.DONE_UPDATE_TX_ENV, () => {
      callback();      
      ipcRenderer.removeAllListeners(channels.DONE_UPDATE_TX_ENV);
    });
    
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.DONE_UPDATE_TX_ENV);
    };
  };

  const toggleDuplicate = ({txID, isDuplicate}) => {
    // Request we update the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.SET_DUPLICATE, { txID: txID, isDuplicate: isDuplicate });
    
    // Wait till we are done
    ipcRenderer.on(channels.DONE_SET_DUPLICATE, () => {
      callback();      
      ipcRenderer.removeAllListeners(channels.DONE_SET_DUPLICATE);
    });
    
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.DONE_SET_DUPLICATE);
    };
  };

  const toggleVisibility = ({txID, isVisible}) => {
    // Request we update the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.SET_VISIBILITY, { txID: txID, isVisible: isVisible });
    
    // Wait till we are done
    ipcRenderer.on(channels.DONE_SET_VISIBILITY, () => {
      callback();      
      ipcRenderer.removeAllListeners(channels.DONE_SET_VISIBILITY);
    });
    
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.DONE_SET_VISIBILITY);
    };
  };

  useEffect(() => {
    // TODO: Not super happy with this, but it will do for now.
    const oldNumPer = Math.ceil(pagingTotalRecords / pagingNumPages);
    const oldItemIndex = (pagingCurPage-1) * oldNumPer;
    const newItemIndex = Math.ceil(oldItemIndex / pagingPerPage)
    setPagingCurPage(newItemIndex?newItemIndex:1);
    
    setPagingNumPages(Math.ceil(pagingTotalRecords / pagingPerPage));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagingPerPage]);
  
  useEffect(() => {
    const numtx = data?.length;
    if (numtx > 0) {
      setPagingTotalRecords(numtx);
      setPagingNumPages(Math.ceil(numtx / pagingPerPage));
    } else {
      setPagingTotalRecords(0);
      setPagingNumPages(1);
    }
    const tmpData = [...data];
    set_checkbox_array(tmpData);
    setTxData(tmpData);
    
    // If we have new data, reset to page 1
    // If we were only toggling something we likely don't want to do that.
    // In those cases we shouldn't refresh the data.
    if (pagingCurPage > Math.ceil(numtx / pagingPerPage)) {
      setPagingCurPage(1);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    if (txData?.length === isChecked?.length && txData?.length > 0) {
      setDataReady(true);
    } else {
      setDataReady(false);
    }
  }, [txData, isChecked]);


  return (
    <>
    <table className="Table TxTable" cellSpacing={0} cellPadding={0}>
      <thead>
        <tr className="Table THR">
          <th className="Table THR THRC Small">{'Date'}</th>
          <th className="Table THR THRC THRCMed">{'Account'}</th>
          <th className="Table THR THRC">{'Description'}</th>
          <th className="Table THR THRC Small">{'Amount'}</th>
          <th className="Table THR THRC">{'Envelope'}</th>
          <th className="Table THR THRC">{'Split'}</th>
          <th className="Table THR THRC">{' KW '}</th>
          <th className="Table THR THRC THRCClickable">
            <div onClick={() => look_for_dups()}>{' Dup '}</div>
          </th>
          <th className="Table THR THRC THRCClickable">
            <div onClick={() => look_for_invisible()}>{' Vis '}</div>
          </th>
          <th className="Table THR THRC">
            <input type="checkbox" onChange={(e) => {
              for(let iter=((pagingCurPage-1) * pagingPerPage); 
                iter < (pagingCurPage * pagingPerPage); iter++) {
                if (isChecked[iter]) {
                  isChecked[iter].isChecked = e.target.checked;
                }
              }
              setIsChecked([...isChecked]);
              setIsAllChecked(e.target.checked);
            }} checked={isAllChecked}/>
          </th>
        </tr>
      </thead>

      <tbody>
        { dataReady &&
        //for (const [index, item] of txData.entries()) {
          txData.map((item, index) => (
            index < (pagingCurPage * pagingPerPage) &&
            index >= ((pagingCurPage-1) * pagingPerPage) &&
            <tr key={"tx-" + item.txID} className={(item.isDuplicate === 1 ? "TR-duplicate":"TR")}>
              <td className="Table TC">
                <EditDate 
                  in_ID={item.txID.toString()}
                  in_value={dayjs(item.txDate).format('M/D/YYYY')}
                  callback={({id, value}) => {
                    const ipcRenderer = (window as any).ipcRenderer;
                    ipcRenderer.send(channels.UPDATE_TX_DATE, { txID: item.txID, new_value: value });
                  }}
                />
              </td>
              <td className="Table TC Left">{item.account}</td>
              <td className="Table TC Left">
                <EditText
                  name={item.txID.toString()}
                  defaultValue={item.description}
                  onSave={({name, value, previousValue}) => {
                    // Request we rename the account in the DB
                    const ipcRenderer = (window as any).ipcRenderer;
                    ipcRenderer.send(channels.UPDATE_TX_DESC, { txID: item.txID, new_value: value });
                  }}
                  style={{padding: '0px', margin: '0px', minHeight: '1rem'}}
                  className={"editableText"}
                  inputClassName={"normalInput"}
                />
              </td>
              <td className="Table TC Right">{formatCurrency(item.txAmt)}</td>
              <td className="Table TC TCInput">
                <DropDown 
                  id={item.txID}
                  selectedID={item.envID}
                  optionData={envList}
                  changeCallback={handleTxEnvChange}
                  className={item.envID.toString() === "-1" ? "envelopeDropDown-undefined":"envelopeDropDown"}
                />
              </td>
              <td className="Table TC">
                <SplitTransactionModal 
                    txID={item.txID}
                    txDate={item.txDate}
                    txAmt={item.txAmt}
                    txDesc={item.description}
                    cat={item.category}
                    env={item.envelope}
                    envID={item.envID}
                    isSplit={item.isSplit}
                    envList={envList}
                    callback={callback}
                  />
              </td>
              <td className="Table TC">
                  <KeywordSave
                    txID={item.txID}
                    acc={item.account}
                    envID={item.envID}
                    description={item.description}
                    keywordEnvID={item.keywordEnvID} />
              </td>
              <td className="Table TC">
                <div
                  onClick={() => {
                    toggleDuplicate({txID: item.txID, isDuplicate: (item.isDuplicate?0:1)});
                  }}
                  className={"Toggle" + (item.isDuplicate?" Toggle-active":"")}>
                  <FontAwesomeIcon icon={faCopy} />
                </div>
              </td>
              <td className="Table TC">
                <div
                  onClick={() => {
                    toggleVisibility({txID: item.txID, isVisible: (item.isVisible?0:1)});
                  }}
                  className={"Toggle" + (!item.isVisible?" Toggle-active":"")}>
                  <FontAwesomeIcon icon={faEyeSlash} />
                </div>
              </td>
              <td className="Table TC">
                <input type="checkbox" id={item.txID.toString()} onChange={(e) => {
                  isChecked[index].isChecked = e.target.checked;
                  setIsChecked([...isChecked]);
                }} checked={isChecked[index].isChecked}/>
              </td>
            </tr>
          ))
        //}
        }
      </tbody>
      <tfoot>
        <tr className="Table THR">
          <td className="Table THR THRC TC Right" colSpan={3}>
            (Only filtered data, but including all pages) Total:
          </td>
          <td className="Table THR THRC TC Right">{
            formatCurrency(
              txData.reduce((total, curItem, curIndex) => {
                return total + curItem.txAmt;
              }, 0)
            )
          }</td>
          <td className="Table THR TCInput">
            <DropDown
                  id={'change-all-selected-envelopes'}
                  selectedID={changeAllEnvID}
                  optionData={envList}
                  changeCallback={handleChangeAll}
                  className="envelopeDropDown"
                />
          </td>
          <td className="Table THR THRC" colSpan={4}></td>
          <td className="Table THR THRC">
            <button 
              className='trash'
              onClick={() => delete_checked_transactions()}>
                <FontAwesomeIcon icon={faTrash} />
            </button>
          </td>
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
  );
};

export default TransactionTable;
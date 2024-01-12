import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faChevronUp, faChevronDown, faTrash, faReply, faReplyAll } from "@fortawesome/free-solid-svg-icons"
import { channels } from '../shared/constants.js';
import { DropDown } from '../helpers/DropDown.tsx';
import { EditText } from 'react-edit-text';

/*
  TODO:
  - Allow keyword to be tied to an account
  - Show keyword conflicts? 
*/

interface KeywordList {
  id: number;
  envelopeID: number;
  description: string;
  category: string;
  envelope: string;
  account: string;
}

export const ConfigKeyword = () => {
  const [keywordData, setKeywordData] = useState<KeywordList[]>([]);
  const [sortKeyword, setSortKeyword] = useState('10');
  const [envList, setEnvList] = useState<any[]>([]);
  const [accList, setAccList] = useState<any[]>([]);
 
  const load_envelope_list = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_ENV_LIST, {includeInactive: 1});

    // Receive the data
    ipcRenderer.on(channels.LIST_ENV_LIST, (arg) => {
      setEnvList([...arg.map((i) => {
        return {
          id: i.envID,
          text: i.category + (i.category?.length && i.envelope?.length?" : ":"") + i.envelope,
        }
      })]);
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
    ipcRenderer.send(channels.GET_ACCOUNT_NAMES);

    // Receive the data
    ipcRenderer.on(channels.LIST_ACCOUNT_NAMES, (arg) => {
      setAccList([{
        id: "All", text: "All"
      }, ...(arg.map((i) => {
        return { id: i.account, text: i.account }
      }))]);

      ipcRenderer.removeAllListeners(channels.LIST_ACCOUNT_NAMES);
    });
    
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_ACCOUNT_NAMES);
    };
  }

  const load_keywords = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_KEYWORDS);

    // Receive the data
    ipcRenderer.on(channels.LIST_KEYWORDS, (arg) => {
      const tmpArr = sort_keyword_array(arg)
      setKeywordData(tmpArr);
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
      tmpArr.sort((a, b) => a.description.localeCompare(b.description) * (sortDir === '0' ? 1 : -1));
    } else {
      tmpArr.sort((a, b) => {
        
        if (a.category && b.category) {
          const categoryComparison = a.category.localeCompare(b.category);
          if (categoryComparison !== 0) {
            return categoryComparison * (sortDir === '0' ? 1 : -1);
          }
        } else {
          if (!(!a.category && !b.category)) {
            return (a.category && !b.category) ? 1 : -1;
          }
        }
        if (a.envelope && b.envelope) {
          const envelopeComparison = a.envelope.localeCompare(b.envelope);
          if (envelopeComparison !== 0) {
            return envelopeComparison * (sortDir === '0' ? 1 : -1);
          }
        } else {
          if (!(!a.envelope && !b.envelope)) {
            return (a.envelope && !b.envelope) ? 1 : -1;
          }
        }
        return a.description.localeCompare(b.description) * (sortDir === '0' ? 1 : -1);
      });
    }
    return tmpArr;
  }

  const set_keyword_sort = (col, dir) => {
    setSortKeyword(col + dir);
  }

  const handleKeywordDelete = (id) => {
    // Request we delete the keyword in the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.DEL_KEYWORD, {id});
    
    // Wait till we are done
    ipcRenderer.on(channels.DONE_DEL_KEYWORD, () => {
      load_keywords();
      ipcRenderer.removeAllListeners(channels.DONE_DEL_KEYWORD);
    });
    
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.DONE_DEL_KEYWORD);
    };
  };

  const handleKeywordSetAll = (id, force) => {
    // Request we set the keyword in the DB for undefined tx
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.SET_ALL_KEYWORD, {id, force});
  };

  const handleAccountChange = ({id, new_value, new_text}) => {
    // Request we update the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.UPDATE_KEYWORD_ACC, {id, new_value});
  };

  const handleEnvelopeChange = ({id, new_value, new_text}) => {
    // Request we update the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.UPDATE_KEYWORD_ENV, {id, new_value});
  };

  useEffect(() => {
    setKeywordData([...sort_keyword_array(keywordData)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortKeyword]);

  useEffect(() => {
    load_keywords();
    load_account_list();
    load_envelope_list();
  }, []);

  return (
    <table className="Table" cellSpacing={0} cellPadding={0}>
      <thead>
        <tr className="Table THR">
          <th className="Table THR THRC">{'Account'}</th>
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
          keywordData.map(({ id, envelopeID, description, account }, index) => (
            <tr key={"row-"+id} className="Table TR">
              <td className="Table TC">
                <DropDown 
                  id={id}
                  selectedID={account}
                  optionData={accList}
                  changeCallback={handleAccountChange}
                  className={""}
                />
              </td>
              <td className="Table TC Left">
                <EditText
                  name={id.toString()}
                  defaultValue={description} 
                  onSave={({name, value, previousValue}) => {
                    // Request we rename the keyword in the DB
                    const ipcRenderer = (window as any).ipcRenderer;
                    ipcRenderer.send(channels.UPDATE_KEYWORD, { id, new_value: value });
                  }}
                  style={{padding: '0px', margin: '0px', minHeight: '1rem'}}
                  className={"editableText"}
                  inputClassName={"normalInput"}
                />
              </td>
              <td className="Table TC">
                <DropDown 
                  id={id}
                  selectedID={envelopeID}
                  optionData={envList}
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
          ))
        }
      </tbody>
    </table>
  );
};

export default ConfigKeyword;
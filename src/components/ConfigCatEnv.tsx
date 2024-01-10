import React, { useState, useEffect } from 'react';
import { channels } from '../shared/constants.js';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTrash, faEyeSlash } from "@fortawesome/free-solid-svg-icons"
import { DragDropContext, Draggable } from "react-beautiful-dnd"
import { StrictModeDroppable as Droppable } from '../helpers/StrictModeDroppable.js';
import NewCategory from '../helpers/NewCategory.tsx';
import { EditText } from 'react-edit-text';
import NewEnvelope from '../helpers/NewEnvelope.tsx';

export const ConfigCatEnv = () => {
 
  const [catData, setCatData] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load_cats_and_envs = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_CAT_ENV, {onlyActive: 0});

    // Receive the data
    ipcRenderer.on(channels.LIST_CAT_ENV, (arg) => {
      const groupedData = categoryGroupBy(arg, 'catID', 'category');
      const sortedData = Object.values(groupedData).sort(compareCategory);

      setCatData([...sortedData]);
      setLoaded(true);

      ipcRenderer.removeAllListeners(channels.LIST_CAT_ENV);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_CAT_ENV);
    };
  }

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
    
    // Wait till we are done
    ipcRenderer.on(channels.DONE_DEL_CATEGORY, () => {
      load_cats_and_envs();
      ipcRenderer.removeAllListeners(channels.DONE_DEL_CATEGORY);
    });
    
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.DONE_DEL_CATEGORY);
    };
  };

  const handleNewCategory = () => {
    load_cats_and_envs();
  };

  const handleNewEnvelope = () => {
    load_cats_and_envs();
  };

  const handleEnvelopeDelete = (id) => {
    // Request we delete the category in the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.DEL_ENVELOPE, id);
    
    // Wait till we are done
    ipcRenderer.on(channels.DONE_DEL_ENVELOPE, () => {
      load_cats_and_envs();
      ipcRenderer.removeAllListeners(channels.DONE_DEL_ENVELOPE);
    });
    
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.DONE_DEL_ENVELOPE);
    };
  };

  const handleEnvelopeHide = (id) => {
    // Request we delete the category in the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.HIDE_ENVELOPE, id);
    
    // Wait till we are done
    ipcRenderer.on(channels.DONE_HIDE_ENVELOPE, () => {
      load_cats_and_envs();
      ipcRenderer.removeAllListeners(channels.DONE_HIDE_ENVELOPE);
    });
    
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.DONE_HIDE_ENVELOPE);
    };
  };

  const handleOnDragEnd = (result) => {
    if (!result?.destination) return;
    
    if (result.source.droppableId !== result.destination.droppableId) {
      
      // Request we move the envelope in the DB
      const ipcRenderer = (window as any).ipcRenderer;
      ipcRenderer.send(channels.MOV_ENVELOPE,  [result.draggableId, result.destination.droppableId] );
    }
  };

  const handleCatOnSave = (id, value) => {
    let tmpName = value;

    if (tmpName === 'Income') {
      tmpName = 'Income 2'; 
    }
    if (tmpName === 'Uncategorized') {
      tmpName = 'Uncategorized 2';
    }

    // Request we rename the category in the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.REN_CATEGORY, { id: id, name: tmpName });
    
    if (tmpName !== value) {
      // Wait till we are done
      ipcRenderer.on(channels.DONE_REN_CATEGORY, () => {
        load_cats_and_envs();
        ipcRenderer.removeAllListeners(channels.DONE_REN_CATEGORY);
      });
      
      // Clean the listener after the component is dismounted
      return () => {
        ipcRenderer.removeAllListeners(channels.DONE_REN_CATEGORY);
      };
    }
  }

  useEffect(() => {
    if (!loaded) {
      load_cats_and_envs();
    }
  }, []);

  return (
    <>
    <NewCategory callback={handleNewCategory} />
    <DragDropContext onDragEnd={handleOnDragEnd}>
      {catData.map((category, index) => {
        const { catID, cat:cat_name, items } = category;
        
        return (
          <Droppable droppableId={catID.toString()} key={"cat-" + cat_name}>
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
                        <EditText
                          key={"cat-" + catID.toString() + "-" + cat_name}  
                          name={"cat-" + catID.toString()}
                          defaultValue={cat_name}
                          onSave={({name, value, previousValue}) => {
                            handleCatOnSave(catID, value);
                          }}
                          style={{}}
                          className={"cat"}
                          inputClassName={""}
                        />
                      }
                    </div>
                    <NewEnvelope id={catID} callback={handleNewEnvelope} />
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
                        <Draggable key={"env" + env.envID} draggableId={env.envID.toString()} index={index2}>
                          {(provided) => (
                            <article className="cat env ei-container" {...provided.draggableProps} {...provided.dragHandleProps} ref={provided.innerRef}>
                              <article className="cat env ei-container ei">
                                <div className="cat">
                                  <EditText
                                    name={env.envID.toString()}
                                    defaultValue={env.envelope}
                                    onSave={({name, value, previousValue}) => {
                                      // Request we rename the envelope in the DB
                                      const ipcRenderer = (window as any).ipcRenderer;
                                      ipcRenderer.send(channels.REN_ENVELOPE, { id: env.envID, name: value });
                                    }}
                                    style={{}}
                                    className={"cat"}
                                    inputClassName={""}
                                  />
                                </div>
                                <button onClick={() => handleEnvelopeHide( env.envID )}
                                  className={"Toggle" + (!env.isActive?" Toggle-active":"")}>
                                  <FontAwesomeIcon icon={faEyeSlash} />
                                </button>
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
  );
};


export default ConfigCatEnv;
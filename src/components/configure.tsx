// configure.tsx

import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTrash } from "@fortawesome/free-solid-svg-icons"
import { DragDropContext, Draggable } from "react-beautiful-dnd"
import { StrictModeDroppable as Droppable } from '../helpers/StrictModeDroppable.js';
import NewCategory from '../helpers/NewCategory.tsx';
import EditableCategory from '../helpers/EditableCategory.tsx';
import NewEnvelope from '../helpers/NewEnvelope.tsx';
import { channels } from '../shared/constants.js'
import EditableEnvelope from '../helpers/EditableCategory.tsx';

export const Configure: React.FC = () => {
  
  const [data, setData] = useState<any[]>([]);

  const groupBy = (data, key, label) => {
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

  const compare = (a,b) => {
    if (a.cat === 'Income' || b.cat === 'Income') {
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

  const handleDelete = (id) => {
    console.log('del category: ', id);
    
    // Request we delete the category in the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.DEL_CATEGORY, id);

    // Where do we move sub accounts in the deleted category?
    // We should have an un-categorized section

    // Query new data
  };

  const handleEnvDelete = (id) => {
    console.log('del envelope: ', id);
    
    // Request we delete the category in the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.DEL_ENVELOPE, id);

    // Where do we move sub accounts in the deleted category?
    // We should have an un-categorized section

    // Query new data
  };

  const handleOnDragEnd = (result) => {
    if (!result?.destination) return;
    
    console.log("result:", result);
    console.log("src:",result.source);
    console.log("dest:",result.destination);

    if (result.source.droppableId !== result.destination.droppableId) {
      
      // Request we move the envelope in the DB
      const ipcRenderer = (window as any).ipcRenderer;
      ipcRenderer.send(channels.MOV_ENVELOPE,  [result.draggableId, result.destination.droppableId] );
    }
    
    // This is where we re-order the categories in the database.
    //const cats = [...categories];
    //const [reorderedItem] = cats.splice(result.source.index, 1);
    //cats.splice(result.destination.index, 0, reorderedItem);

    // Save this order in local storage.
    // TODO: Need a better way to store this, if its something we 
    // even want, since we'll have to re-sort the categories in
    // several places.
    //const idsOrderArray = cats.map(cat => cat.id);
    //localStorage.setItem('categoryOrder', JSON.stringify(idsOrderArray));

    //setCategories(cats);
  };

  let content;
  if (data) {
    content = (
      <DragDropContext onDragEnd={handleOnDragEnd}>
        
          
            
              {data.map((category, index) => {
                const { catID, cat:cat_name, items } = category;
                //console.log("data:", category[0]);
              
                return (
                  
                  <Droppable droppableId={catID.toString()} key={"cat"+catID.toString()}>
                    {(provided) => (
                      <section  {...provided.droppableProps} ref={provided.innerRef}>
                        <article className="category-container">
                          <article className="category-item">
                            <div className="category">
                              <EditableCategory
                                initialID={catID.toString()}
                                initialName={cat_name} />
                            </div>
                            <NewEnvelope id={catID} />
                            <button className="trash" onClick={() => handleDelete( catID )}>
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </article>
                          
                          <article className="envelope-container">
                          {
                            items.map((env, index2) => {
                              //console.log("env:", env);  
                              return (
                                (env.envID) &&
                                <Draggable key={env.envID.toString()} draggableId={env.envID.toString()} index={index2}>
                                  {(provided) => (
                                    <article className="envelope-item-container" {...provided.draggableProps} {...provided.dragHandleProps} ref={provided.innerRef}>
                                      <article className="envelope-item">
                                        <div className="envelope">
                                          <EditableEnvelope
                                            initialID={env.envID.toString()}
                                            initialName={env.envelope} />
                                        </div>
                                        <button className="trash" onClick={() => handleEnvDelete( env.envID )}>
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
    )
  }

  

  useEffect(() => {
    const ipcRenderer = (window as any).ipcRenderer;

    // Signal we want to get data
    //console.log('Calling main:get_data');
    ipcRenderer.send(channels.GET_CAT_ENV);

    // Receive the data
    ipcRenderer.on(channels.LIST_CAT_ENV, (arg) => {

      //console.log('arg:', {...arg});

      const groupedData = groupBy(arg, 'catID', 'category');
      //console.log('grouped:', groupedData);

      const sortedData = Object.values(groupedData).sort(compare);
      //console.log('sorted:', sortedData);

      setData(sortedData);

      ipcRenderer.removeAllListeners(channels.LIST_CAT_ENV);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_CAT_ENV);
    };

  }, []);


  return (
    <div className="App">
      <header className="App-header">
        {<Header />}
      </header>
      <div>
        Configure<br/>
        <NewCategory/>        
        {content}
      </div>
    </div>
  );
};

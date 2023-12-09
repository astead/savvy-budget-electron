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
//import { EnvelopeList } from '../helpers/EnvelopeList.tsx';

export const Configure: React.FC = () => {
  
  const [data, setData] = useState<any[]>([]);

  const groupBy = (data, key) => {
    return data.reduce(function(acc, item) {
      let groupKey = item[key];
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(item);
      return acc;
    }, {});
  };

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
        
          
            
              {Object.values(data).map((category, index) => {
                const { catID, category:cat_name, envID, envelope:env_name } = category[0];
                //console.log("data:", category[0]);
              
                return (
                  
                  <Droppable droppableId={catID.toString()}>
                    {(provided) => (
                      <section  {...provided.droppableProps} ref={provided.innerRef}>
                        <article className="category-container">
                          <article className="category-item">
                            <div className="category">
                              <EditableCategory
                                initialID={catID}
                                initialName={cat_name} />
                            </div>
                            <button className="trash" onClick={() => handleDelete( catID )}>
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </article>
                          <NewEnvelope id={catID} />
                          {
                            category.map((env, index2) => {
                              //console.log("env:", env);  
                              return (
                                (env.envID) &&
                                <Draggable key={env.envID} draggableId={env.envID.toString()} index={index2}>
                                  {(provided) => (
                                    <article className="envelope-container" {...provided.draggableProps} {...provided.dragHandleProps} ref={provided.innerRef}>
                                      <article className="envelope-item">
                                        <div className="envelope">
                                          <EditableEnvelope
                                            initialID={env.envID}
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
      //console.log('arg:' + arg);
      setData(groupBy(arg, 'catID'));

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

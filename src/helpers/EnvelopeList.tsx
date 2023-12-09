import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTrash } from "@fortawesome/free-solid-svg-icons"
import { DragDropContext, Draggable } from "react-beautiful-dnd"
import { StrictModeDroppable as Droppable } from './StrictModeDroppable.js';
import { channels } from '../shared/constants.js'
import EditableEnvelope from './EditableCategory.tsx';

export const EnvelopeList = ({ parentCategoryID }) => {
  
  const [categoryID] = useState(parentCategoryID);
  const [data, setData] = useState<any[]>([]);
  const [envelopes, setEnvelopes] = useState<any[]>(data || []);
  

  const handleDelete = (id) => {
    console.log('del envelope: ', id);
    
    const orderData = localStorage.getItem('envelopeOrder');
    if (orderData) {
      const arrayIdsOrder = JSON.parse(orderData);
      
      if (arrayIdsOrder?.length) {
        const newIdsOrderArray = arrayIdsOrder.filter(num => num !== id);
        localStorage.setItem('envelopeOrder', JSON.stringify(newIdsOrderArray));
      }
    }

    // Request we delete the category in the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.DEL_ENVELOPE, id);

    // Where do we move sub accounts in the deleted category?
    // We should have an un-categorized section

    // Query new data
  };

  const handleOnDragEnd = (result) => {
    if (!result?.destination) return;
    
    // This is where we re-order the categories in the database.
    const envs = [...envelopes];
    const [reorderedItem] = envs.splice(result.source.index, 1);
    envs.splice(result.destination.index, 0, reorderedItem);

    // Save this order in local storage.
    // TODO: Need a better way to store this, if its something we 
    // even want, since we'll have to re-sort the categories in
    // several places.
    const idsOrderArray = envs.map(env => env.id);
    localStorage.setItem('envelopeOrder', JSON.stringify(idsOrderArray));

    setEnvelopes(envs);
  };

  let content;
  if (envelopes) {
    content = (
      
              envelopes.map((envelope, index) => {
                return (
                      <article className="envelope-container">
                        <article className="envelope-item">
                          <div className="envelope">
                            <EditableEnvelope
                              initialID={envelope.id.toString()}
                              initialName={envelope.envelope} />
                          </div>
                          <button className="trash" onClick={() => handleDelete( envelope.id )}>
                              <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </article>
                      </article>
                    )})
                
              
    )
  }

  

  useEffect(() => {
    const orderData = localStorage.getItem('envelopeOrder');
    let arrayIdsOrder;

    if (!orderData && data?.length) {
      const idsOrderArray = data.map(category => category.id);
      localStorage.setItem('envelopeOrder', JSON.stringify(idsOrderArray));
    }
    if (orderData) {
      arrayIdsOrder = JSON.parse(orderData);
    }

    let myArray;    
    if (arrayIdsOrder?.length && data?.length) {
      myArray = arrayIdsOrder.map(pos => {
        return data.find(el => el.id === pos)
      });

      const newItems = data.filter(el => {
        return !arrayIdsOrder.includes(el.id);
      });
      if (newItems?.length) myArray = [...newItems, ...myArray];
    }

    setEnvelopes(myArray || data);
  }, [data]);

  useEffect(() => {
    const ipcRenderer = (window as any).ipcRenderer;
    
    // Signal we want to get data
    //console.log('Calling main:get_data');
    ipcRenderer.send(channels.GET_ENVELOPES, categoryID);
    
    // Receive the data
    ipcRenderer.on(channels.LIST_ENVELOPE + categoryID, (arg) => {
      //console.log('arg:' + arg);
      setData(arg);

      ipcRenderer.removeAllListeners(channels.LIST_ENVELOPE + categoryID);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.LIST_ENVELOPE + categoryID);
    };

  }, []);

  return (
    <div>
      {content}
    </div>
  );
};

export default EnvelopeList;
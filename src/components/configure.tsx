// configure.tsx

import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTrash } from "@fortawesome/free-solid-svg-icons"
import { DragDropContext, Draggable } from "react-beautiful-dnd"
import { StrictModeDroppable as Droppable } from '../helpers/StrictModeDroppable.js';
import NewCategory from '../helpers/NewCategory.tsx';
import EditableText from '../helpers/EditableText.tsx';
import NewEnvelope from '../helpers/NewEnvelope.tsx';

export const Configure: React.FC = () => {
  
  const [data, setData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>(data || []);

  
  const handleDelete = (id) => {
    console.log('del category: ', id);
    
    const orderData = localStorage.getItem('categoryOrder');
    if (orderData) {
      const arrayIdsOrder = JSON.parse(orderData);
      
      if (arrayIdsOrder?.length) {
        const newIdsOrderArray = arrayIdsOrder.filter(num => num !== id);
        localStorage.setItem('categoryOrder', JSON.stringify(newIdsOrderArray));
      }
    }

    // Request we delete the category in the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send('del_category', id);

    // Where do we move sub accounts in the deleted category?
    // We should have an un-categorized section

    // Query new data
  };

  const handleOnDragEnd = (result) => {
    if (!result?.destination) return;
    
    // This is where we re-order the categories in the database.
    const cats = [...categories];
    const [reorderedItem] = cats.splice(result.source.index, 1);
    cats.splice(result.destination.index, 0, reorderedItem);

    // Save this order in local storage.
    // TODO: Need a better way to store this, if its something we 
    // even want, since we'll have to re-sort the categories in
    // several places.
    const idsOrderArray = cats.map(cat => cat.id);
    localStorage.setItem('categoryOrder', JSON.stringify(idsOrderArray));

    setCategories(cats);
  };

  let content;
  if (categories) {
    content = (
      <DragDropContext onDragEnd={handleOnDragEnd}>
        <Droppable droppableId='categories'>
          {(provided) => (
            <section {...provided.droppableProps} ref={provided.innerRef}>
              {categories.map((category, index) => {
                return (
                  <Draggable key={category.id} draggableId={category.id.toString()} index={index}>
                    {(provided) => (
                      <article className="category-container" {...provided.draggableProps} {...provided.dragHandleProps} ref={provided.innerRef}>
                        <article className="category-item">
                          <div className="category">
                            <EditableText
                              id={category.id.toString()}
                              initialText={category.category} />
                          </div>
                          <button className="trash" onClick={() => handleDelete( category.id )}>
                              <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </article>
                        <NewEnvelope id={category.id.toString()}/>
                      </article>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </section>
          )}
        </Droppable>
      </DragDropContext>
    )
  }

  useEffect(() => {
    const orderData = localStorage.getItem('categoryOrder');
    let arrayIdsOrder;

    if (!orderData && data?.length) {
      const idsOrderArray = data.map(category => category.id);
      localStorage.setItem('categoryOrder', JSON.stringify(idsOrderArray));
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

    setCategories(myArray || data);
  }, [data]);

  useEffect(() => {
    const ipcRenderer = (window as any).ipcRenderer;
    
    // Signal we want to get data
    //console.log('Calling main:get_data');
    ipcRenderer.send('get_data', 'category_list');
    
    // Receive the data
    ipcRenderer.on('list_data', (arg) => {
      //console.log('arg:' + arg);
      setData(arg);

      ipcRenderer.removeAllListeners('list_data');
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners('list_data');
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

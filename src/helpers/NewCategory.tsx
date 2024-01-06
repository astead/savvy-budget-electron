import React, { useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus } from "@fortawesome/free-solid-svg-icons"
import { channels } from '../shared/constants.js';

export const NewCategory = ({ callback }) => {
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = () => {
    if (newCategory) {
      // Request we add the new category
      const ipcRenderer = (window as any).ipcRenderer;
      ipcRenderer.send(channels.ADD_CATEGORY, newCategory);
    
      // Wait till we are done
      ipcRenderer.on(channels.DONE_ADD_CATEGORY, () => {
        callback();
        //console.log(callback);
        ipcRenderer.removeAllListeners(channels.DONE_ADD_CATEGORY);
      });
      
      // Clean the listener after the component is dismounted
      return () => {
        ipcRenderer.removeAllListeners(channels.DONE_ADD_CATEGORY);
      };
    } else {
      setError("Please enter a new category name.");
    }
  };  

  return (
    <div className="new-category-container">
        <div className="new-category">
            <input
                type="text"
                id="new-category"
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  setError("");
                }}
                placeholder="Enter new category"
            />
            {error &&
              <><br/><span className="Red">{"Error: " + error}</span></>
            }
        </div>
        <button onClick={handleSubmit}>
            <FontAwesomeIcon icon={faPlus} />
        </button>
    </div>
  );
};

export default NewCategory;
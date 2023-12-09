import React, { useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus } from "@fortawesome/free-solid-svg-icons"
import { channels } from '../shared/constants.js'

export const NewCategory = () => {
  const [newCategory, setNewCategory] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();  
    if (newCategory) {
      console.log('new category: ', newCategory);
        
      // Request we add the new category
      const ipcRenderer = (window as any).ipcRenderer;
      ipcRenderer.send(channels.ADD_CATEGORY, newCategory);

      // Reset the label in the new category
      //setNewCategory('');
    }
  };  

  return (
    <form onSubmit={handleSubmit} className="new-category">
        <label htmlFor="new-category">Enter a new category</label>
        <div className="new-category">
            <input
                type="text"
                id="new-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter new category"
            />
        </div>
        <button className="submit">
            <FontAwesomeIcon icon={faPlus} />
        </button>
    </form>
  );
};

export default NewCategory;
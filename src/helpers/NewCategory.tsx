import React, { useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faUpload } from "@fortawesome/free-solid-svg-icons"

export const NewCategory = () => {
  const [newCategory, setNewCategory] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();  
    if (newCategory) {
      const data = newCategory;
      console.log('new category: ', data);
        
      // Request we add the new category
      const ipcRenderer = (window as any).ipcRenderer;
      ipcRenderer.send('add_category', data);

      // Reset the label in the new category
      //setNewCategory('');
      
      // Query new data
    }
  };  

  return (
    <form onSubmit={handleSubmit}>
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
            <FontAwesomeIcon icon={faUpload} />
        </button>
    </form>
  );
};

export default NewCategory;
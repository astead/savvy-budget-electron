import React, { useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus } from "@fortawesome/free-solid-svg-icons"
import { channels } from '../shared/constants.js'

export const NewEnvelope = ({ id }) => {
  const [categoryID, ] = useState(id);
  
  const handleSubmit = (e) => {
    e.preventDefault();  
    
      console.log(categoryID, ' new envelope ');
        
      // Request we add the new category
      const ipcRenderer = (window as any).ipcRenderer;
      ipcRenderer.send(channels.ADD_ENVELOPE, { categoryID });

      // Reset the label in the new category
      //setNewCategory('');
  };  

  return (
    <form onSubmit={handleSubmit} className="new-envelope">
        <button className="submit">
            <FontAwesomeIcon icon={faPlus} />
        </button>
    </form>
  );
};

export default NewEnvelope;
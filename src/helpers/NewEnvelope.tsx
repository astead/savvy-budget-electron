import React, { useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus } from "@fortawesome/free-solid-svg-icons"
import { channels } from '../shared/constants.js'

export const NewEnvelope = ({ id }) => {
  const [categoryID, ] = useState(id);
  
  const handleSubmit = () => {
    // Request we add the new category
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.ADD_ENVELOPE, { categoryID });

    // Reset the label in the new category
    //setNewCategory('');
  };  

  return (
    <button className="plusButton" onClick={handleSubmit}>
        <FontAwesomeIcon icon={faPlus} />
    </button>
  );
};

export default NewEnvelope;
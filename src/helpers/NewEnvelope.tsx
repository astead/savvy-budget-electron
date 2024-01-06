import React, { useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus } from "@fortawesome/free-solid-svg-icons"
import { channels } from '../shared/constants.js';

export const NewEnvelope = ({ id, callback }) => {
  const [categoryID, ] = useState(id);
  
  const handleSubmit = () => {
    // Request we add the new category
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.ADD_ENVELOPE, { categoryID });
    
    // Wait till we are done
    ipcRenderer.on(channels.DONE_ADD_ENVELOPE, () => {
      callback();
      ipcRenderer.removeAllListeners(channels.DONE_ADD_ENVELOPE);
    });
    
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.DONE_ADD_ENVELOPE);
    };
  };  

  return (
    <button onClick={handleSubmit}>
        <FontAwesomeIcon icon={faPlus} />
    </button>
  );
};

export default NewEnvelope;
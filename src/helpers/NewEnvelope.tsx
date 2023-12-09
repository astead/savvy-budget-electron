import React, { useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faUpload } from "@fortawesome/free-solid-svg-icons"
import { channels } from '../shared/constants.js'

export const NewEnvelope = ({ id }) => {
  const [categoryID, ] = useState(id);
  const [newEnvelope, setNewEnvelope] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();  
    if (newEnvelope) {
      console.log(categoryID, ' new envelope: ', newEnvelope);
        
      // Request we add the new category
      const ipcRenderer = (window as any).ipcRenderer;
      ipcRenderer.send(channels.ADD_ENVELOPE, { categoryID, newEnvelope });

      // Reset the label in the new category
      //setNewCategory('');
    }
  };  

  return (
    <form onSubmit={handleSubmit} className="new-envelope">
        <div className="new-envelope">
            <input
                type="text"
                id="new-envelope"
                value={newEnvelope}
                onChange={(e) => setNewEnvelope(e.target.value)}
                placeholder="Add new envelope"
            />
        </div>
        <button className="submit">
            <FontAwesomeIcon icon={faUpload} />
        </button>
    </form>
  );
};

export default NewEnvelope;
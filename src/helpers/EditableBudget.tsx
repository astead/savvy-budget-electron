import React, { useState } from 'react';
import 'react-edit-text/dist/index.css';
import { channels } from '../shared/constants.js';

export const EditableBudget = ({ initialID, initialDate, initialValue}) => {
  const [id, ] = useState(initialID);
  const [myDate, ] = useState(initialDate);
  const [value, setValue] = useState(initialValue);

  const handleChange = (e, setFn) => {
    setFn(e.target.value);
  };

  const handleEnvBlur = () => {
    console.log('handleEnvBlur: updating budget ');
    
    // Request we update the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.UPDATE_BUDGET, [id, myDate, value]);
  };

  return (
    <input
      name={id}
      value={value}
      onChange={(e) => handleChange(e, setValue)}
      onBlur={handleEnvBlur}
      className="Curr"
    />
  );
};

export default EditableBudget;
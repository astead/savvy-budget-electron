import React, { useState } from 'react';
import 'react-edit-text/dist/index.css';
import { channels } from '../shared/constants.js';

export const EditableBudget = ({ index, id, date, value, callback}) => {
  const [myID, ] = useState(id);
  const [myDate, ] = useState(date);
  const [myValue, setValue] = useState(value);

  const handleChange = (e, setFn) => {
    setFn(e.target.value);
  };

  const handleEnvBlur = () => {
    // Request we update the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.UPDATE_BUDGET, [myID, myDate, myValue]);
    
    // Wait till we are done
    ipcRenderer.on(channels.DONE_UPDATE_BUDGET, () => {
      callback(index, myValue);
      ipcRenderer.removeAllListeners(channels.DONE_UPDATE_BUDGET);
    });
    
    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners(channels.DONE_UPDATE_BUDGET);
    };
  };

  return (
    <input
      name={myID}
      value={myValue}
      onChange={(e) => handleChange(e, setValue)}
      onBlur={handleEnvBlur}
      className="Curr"
    />
  );
};

export default EditableBudget;
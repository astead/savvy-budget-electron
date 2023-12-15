import React, { useState } from 'react';
import 'react-edit-text/dist/index.css';
import { channels } from '../shared/constants.js'

export const CategoryDropDown = ({txID, envID, name, data}) => {
  
  if (envID === null) {
    envID = -1;
  }
  
  const [my_txID, ] = useState(txID);
  const [my_envID, ] = useState(envID);
  const [my_data, ] = useState(data);

  console.log(data);
  console.log(envID);

  const handleChange = (e) => {
    console.log('handleChange: updating category ');
    
    // Request we update the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.UPDATE_TX_ENV, [my_txID, e.target.value]);
  };

  return (
    <select
      name={my_txID}
      value={envID}
      onChange={handleChange}
      className={"envelopeDropDown"+(envID === -1 ? "-undefined":"")}>
        {data.map(o => (
          <option key={o.envID} value={o.envID}>{o.category + " : " + o.envelope}</option>
        ))}
    </select>
  );
};

export default CategoryDropDown;
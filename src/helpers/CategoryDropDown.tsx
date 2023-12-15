import React, { useState } from 'react';
import 'react-edit-text/dist/index.css';
import { channels } from '../shared/constants.js'

export const CategoryDropDown = ({id, envID, data, changeCallback}) => {
  
  if (envID === null) {
    envID = -1;
  }
  
  const [my_id, ] = useState(id);
  const [my_envID, ] = useState(envID);
  const [my_data, ] = useState(data);

  const handleChange = (e) => {
    changeCallback({id: my_id, new_value: e.target.value});
  };

  return (
    <select
      name={my_id}
      value={my_envID}
      onChange={handleChange}
      className={"envelopeDropDown"+(envID === -1 ? "-undefined":"")}>
        <option key='-1' value='-1'>Undefined</option>
        {my_data.map(o => (
          <option key={o.envID} value={o.envID}>{o.category + " : " + o.envelope}</option>
        ))}
    </select>
  );
};

export default CategoryDropDown;
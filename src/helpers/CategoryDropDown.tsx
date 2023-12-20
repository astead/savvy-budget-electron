import React, { useState, useEffect } from 'react';
import 'react-edit-text/dist/index.css';
import { channels } from '../shared/constants.js'

export const CategoryDropDown = ({id, envID, data, changeCallback}) => {
  
  if (envID === null) {
    envID = -1;
  }
  
  const [my_id, setMy_ID] = useState(id);
  const [my_envID, setMy_envID] = useState(envID);
  const [my_data, ] = useState(data);

  const handleChange = (e) => {
    var index = e.nativeEvent.target.selectedIndex;
    
    changeCallback({id: my_id, new_value: e.target.value, new_text: e.nativeEvent.target[index].text});
    
    setMy_envID(e.target.value);
  };

  useEffect(() => {
    setMy_ID(id);
  }, [id]);

  useEffect(() => {
    setMy_envID(envID);
  }, [envID]);


  return (
    <select
      name={my_id}
      value={my_envID}
      onChange={handleChange}
      className={"envelopeDropDown"+(envID === -1 ? "-undefined":"")}>
        {my_data.map(o => (
          <option 
            key={o.envID} 
            value={o.envID}>
              {o.category + (o.category?.length && o.envelope?.length?" : ":"") + o.envelope}
          </option>
        ))}
    </select>
  );
};

export default CategoryDropDown;
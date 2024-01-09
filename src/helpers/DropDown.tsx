import React, { useState, useEffect } from 'react';
import 'react-edit-text/dist/index.css';

export const DropDown = ({id, selectedID, optionData, changeCallback, className}) => {
  
  if (selectedID === null) {
    selectedID = "-1";
  }
  
  const [my_id, setMy_ID] = useState(id);
  const [my_selectedID, setMy_selectedID] = useState(selectedID);
  const [my_optionData, setMy_optionData] = useState(optionData);

  const handleChange = (e) => {
    var index = e.nativeEvent.target.selectedIndex;
    changeCallback({id: my_id, new_value: e.target.value, new_text: e.nativeEvent.target[index].text});
    setMy_selectedID(e.target.value);
  };

  useEffect(() => {
    setMy_ID(id);
  }, [id]);

  useEffect(() => {
    setMy_selectedID(selectedID);
  }, [selectedID]);

  useEffect(() => {
    setMy_optionData([...optionData]);
  }, [optionData]);

  return (
    <select
      name={my_id}
      value={my_selectedID}
      onChange={handleChange}
      className={className+(my_selectedID.toString() === "-1" ? "-undefined":"")}>
        {my_optionData.map(o => (
          <option key={o.id} value={o.id}>{o.text}</option>
        ))}
    </select>
  );
};

export default DropDown;
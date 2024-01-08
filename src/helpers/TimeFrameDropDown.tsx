import React, { useState, useEffect } from 'react';

export const TimeFrameDropDown = ({id, time_id, data, changeCallback, className}) => {
  
  if (time_id === null) {
    time_id = 1;
  }
  
  const [my_id, setMy_ID] = useState(id);
  const [my_time_id, setMy_time_id] = useState(time_id);
  const [my_data, ] = useState(data);

  const handleChange = (e) => {
    setMy_time_id(e.target.value);
    changeCallback({id: my_id, new_value: e.target.value});
  };

  useEffect(() => {
    setMy_ID(id);
  }, [id]);

  useEffect(() => {
    setMy_time_id(time_id);
  }, [time_id]);

  return (
    <select
      name={my_id}
      value={my_time_id}
      onChange={handleChange}
      className={className+(time_id === -1 ? "-undefined":"")}>
        {my_data.map(o => (
          <option 
            key={o.id} 
            value={o.id}>
              {o.text}
          </option>
        ))}
    </select>
  );
};

export default TimeFrameDropDown;
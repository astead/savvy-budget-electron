import React, { useEffect, useState } from 'react';
import 'react-edit-text/dist/index.css';

export const InputText = ({ in_ID, in_value, callback, className, style}) => {
  const [id, ] = useState(in_ID);
  const [value, setValue] = useState(in_value);

  const handleChange = (e, setFn) => {
    setFn(e.target.value);
  };

  const handleBlur = () => {
    callback(id, value);
  };

  useEffect(() => {
    setValue(in_value);
  }, [in_value]);

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => handleChange(e, setValue)}
      onBlur={handleBlur}
      className={className}
      style={style}
     />
  );
};

export default InputText;
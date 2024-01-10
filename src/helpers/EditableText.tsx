import React, { useState } from 'react';
import { EditText } from 'react-edit-text';
import 'react-edit-text/dist/index.css';

export const EditableText = ({ initialID, initialValue, callback, style, className, inputClassName}) => {
  const [id, ] = useState(initialID);
  const [value, setValue] = useState(initialValue);

  return (
    <EditText
      name={id}
      defaultValue={value}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={callback(id, value)}
      style={style}
      className={className}
      inputClassName={inputClassName} />
  );
};

export default EditableText;
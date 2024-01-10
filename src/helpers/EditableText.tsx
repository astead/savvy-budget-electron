import React, { useState } from 'react';
import { EditText } from 'react-edit-text';
import 'react-edit-text/dist/index.css';

export const EditableText = ({ initialID, initialName, callback, style, className, inputClassName}) => {
  const [id, ] = useState(initialID);
  const [name, setName] = useState(initialName);

  return (
    <EditText
      name={id}
      defaultValue={name}
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={callback(id, name)}
      style={style}
      className={className}
      inputClassName={inputClassName} />
  );
};

export default EditableText;
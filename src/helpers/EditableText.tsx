import React, { useState } from 'react';
import { EditText } from 'react-edit-text';
import 'react-edit-text/dist/index.css';

export const EditableText = ({ id, initialText}) => {
  const [myId, ] = useState(id);
  const [text, setText] = useState(initialText);

  const handleChange = (e, setFn) => {
    setFn(e.target.value);
  };

  const handleBlur = () => {
    console.log('onBlur: ', myId, text);
    
    // Request we rename the category in the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send('rename_category', {id:myId, name:text});
  };

  return (
    <EditText
      name={myId}
      defaultValue={text}
      value={text}
      onChange={(e) => handleChange(e, setText)}
      onBlur={handleBlur} />
  );
};

export default EditableText;
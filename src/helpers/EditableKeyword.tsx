import React, { useState } from 'react';
import { EditText } from 'react-edit-text';
import 'react-edit-text/dist/index.css';
import { channels } from '../shared/constants.js';

export const EditableKeyword = ({ initialID, initialDescription}) => {
  const [id, ] = useState(initialID);
  const [description, setDescription] = useState(initialDescription);

  const handleChange = (e, setFn) => {
    setFn(e.target.value);
  };

  const handleEnvBlur = () => {
    // Request we rename the category in the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.UPDATE_KEYWORD, { id, new_value: description });
  };

  return (
    <EditText
      name={id}
      defaultValue={description}
      value={description}
      onChange={(e) => handleChange(e, setDescription)}
      onBlur={handleEnvBlur}
      style={{padding: '0px', margin: '0px', minHeight: '1rem'}}
      className="editableText"
      inputClassName="normalInput" />
  );
};

export default EditableKeyword;
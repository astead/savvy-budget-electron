import React, { useState } from 'react';
import { EditText } from 'react-edit-text';
import 'react-edit-text/dist/index.css';
import { channels } from '../shared/constants.js'

export const EditableAccount = ({ initialID, initialName}) => {
  const [id, ] = useState(initialID);
  const [name, setName] = useState(initialName);

  const handleChange = (e, setFn) => {
    setFn(e.target.value);
  };

  const handleEnvBlur = () => {
    // Request we rename the category in the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.UPDATE_ACCOUNT, { id, new_value: name });
  };

  return (
    <EditText
      name={id}
      defaultValue={name}
      value={name}
      onChange={(e) => handleChange(e, setName)}
      onBlur={handleEnvBlur}

      className="envelope"
      inputClassName="" />
  );
};

export default EditableAccount;
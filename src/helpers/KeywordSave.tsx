import React, { useState } from 'react';
import 'react-edit-text/dist/index.css';
import { channels } from '../shared/constants.js'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faBookmark } from "@fortawesome/free-solid-svg-icons"

export const KeywordSave = ({txID, envID, description, keywordEnvID}) => {
  const [my_txID, ] = useState(txID);
  const [my_envID, ] = useState(envID);
  const [my_description, ] = useState(description);
  const [my_keywordEnvID, ] = useState(keywordEnvID);

  const saveKeyword = (e) => {
    // Request we update the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.SAVE_KEYWORD, [my_envID, my_description]);
  };

  return (
    <div
      onClick={saveKeyword}
      className={"SaveKeyword" + (my_keywordEnvID === my_envID && my_envID !== null ?"-saved":"")}>
      <FontAwesomeIcon icon={faBookmark} />
    </div>
  );
};

export default KeywordSave;
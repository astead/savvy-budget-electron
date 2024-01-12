import React, { useState, useEffect } from 'react';
import 'react-edit-text/dist/index.css';
import { channels } from '../shared/constants.js';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faBookmark } from "@fortawesome/free-solid-svg-icons"

export const KeywordSave = ({txID, acc, envID, description, keywordEnvID}) => {
  //const [my_txID, ] = useState(txID);
  const [my_envID, setEnvID] = useState(envID);
  const [my_description, setDescription] = useState(description);
  const [my_keywordEnvID, setKeywordEnvID] = useState(keywordEnvID);

  const saveKeyword = (e) => {
    // Request we update the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.SAVE_KEYWORD, { acc: acc, envID: my_envID, description: my_description });

    // Rather than wait for the DB and re-query
    // let's just set this to our own env ID
    setKeywordEnvID(my_envID);
  };

  useEffect(() => {
    setEnvID(envID);
  }, [envID]);

  useEffect(() => {
    setDescription(description);
  }, [description]);

  useEffect(() => {
    setKeywordEnvID(keywordEnvID);
  }, [keywordEnvID]);

  return (
    <div
      onClick={saveKeyword}
      className={"Toggle" + (my_keywordEnvID === my_envID && my_envID !== null ?" Toggle-active":"")}>
      <FontAwesomeIcon icon={faBookmark} />
    </div>
  );
};

export default KeywordSave;
import React, { useState } from 'react';
import Box from '@mui/material/Box';
//import Button from '@mui/material/Button';
//import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { channels } from '../shared/constants.js'
import { CategoryDropDown } from './CategoryDropDown.tsx';

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 'fit-content',
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

function formatCurrency(currencyNumber:number) {
  return currencyNumber.toLocaleString('en-EN', {style: 'currency', currency: 'USD'});
};

export const BudgetBalanceModal = ({balanceAmt, category, envelope, envID, transferEnvList}) => {
  const [open, setOpen] = useState(false);
  const [newAmt, setNewAmt] = useState(balanceAmt);
  const [transferAmt, setTransferAmt] = useState(balanceAmt);
  const [transferEnvID, setTransferEnvID] = useState(envID);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleSaveNewValue = () => {
    // Request we update the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.UPDATE_BALANCE, [envID, newAmt]);
    setOpen(false);
  };

  const handleSaveTransfer = () => {
    // Request we update the DB
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.MOVE_BALANCE, [transferAmt, envID, transferEnvID]);
    setOpen(false);
  };

  const handleFilterEnvChange = ({id, new_value, new_text}) => {
    setTransferEnvID(new_value);
  };

  return (
    <>
      <span onClick={handleOpen}>{formatCurrency(balanceAmt)}</span>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          What do you want to do with balance from:<br/>
          {category} : {envelope}?<br/><br/>
          Adjust it: 
          <input
            name={'adjust-balance-'+envID}
            defaultValue={balanceAmt}
            onChange={(e) => setNewAmt(e.target.value)}
            className="BudgetBalanceTransfer"
          />
          <button 
            className='import'
            onClick={handleSaveNewValue}>
              <FontAwesomeIcon icon={faArrowRight} />
          </button>
          <br/>
          <br/>
          Move 
          <input
            name={'adjust-balance-' + envID}
            defaultValue={balanceAmt}
            onChange={(e) => setTransferAmt(e.target.value)}
            className="BudgetBalanceTransfer"
          />
          to&nbsp;
          <CategoryDropDown 
            id={'transfer-from-' + envID}
            envID={envID}
            data={transferEnvList}
            changeCallback={handleFilterEnvChange}
            className="envelopeDropDown"
          />
          <button 
            className='import'
            onClick={handleSaveTransfer}>
              <FontAwesomeIcon icon={faArrowRight} />
          </button>
          <br/>
        </Box>
      </Modal>
    </>
  );
};

export default BudgetBalanceModal;

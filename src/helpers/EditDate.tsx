import React, { useState } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import * as dayjs from 'dayjs'

export const EditDate = ({ in_ID, in_value, callback}) => {
  const [value, setValue] = useState(in_value);
  const [isEditing, setIsEditing] = useState(false);
  const handleEdit = () => setIsEditing(true);
  
  return (
    <>
      { isEditing &&
       <>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            value={dayjs(value)}
            onChange={(newValue) => {
              setValue(newValue?.format('M/D/YYYY'));
              callback({id:in_ID, value: newValue?.format('YYYY-MM-DD')});
              setIsEditing(false);
            }}
            onClose={() => {
              setIsEditing(false);
            }}
            sx={{ width:150, pr:0 }}
            autoFocus={true}
            open={true}
            />
        </LocalizationProvider>
       </>
      }
      { !isEditing &&
        <span onClick={handleEdit} className="clickable">
          {value}
        </span>
      }
    </>
  );
};

export default EditDate;
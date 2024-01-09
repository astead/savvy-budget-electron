// configure.tsx

import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { ConfigCatEnv } from './ConfigCatEnv.tsx';
import { ConfigKeyword } from './ConfigKeyword.tsx';
import { ConfigAccount } from './ConfigAccount.tsx';
import { ConfigDB } from './ConfigDB.tsx';
import { ConfigPlaid } from './ConfigPlaid.tsx';

import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

/*
  TODO:
  - Show keyword conflicts? 
  - allow DB file to be on Google Drive?
    Not sure we if need to do anything special here if we have a local copy of the file.
  - Show more DB data? transaction dates, # transactions, # accounts?
*/
export const Configure = () => {


  interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    tabValue: number;
  }

  function CustomTabPanel(props: TabPanelProps) {
    const { children, tabValue, index, ...other } = props;

    return (
      <div
        role="tabpanel"
        hidden={tabValue !== index}
        id={`simple-tabpanel-${index}`}
        aria-labelledby={`simple-tab-${index}`}
        {...other}
      >
        {tabValue === index && (
          <Box sx={{ pt: 3, m: 'auto' }}>
            <Typography component={"span"}>{children}</Typography>
          </Box>
        )}
      </div>
    );
  }

  function a11yProps(index: number) {
    return {
      id: `simple-tab-${index}`,
      'aria-controls': `simple-tabpanel-${index}`,
    };
  }
  
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    localStorage.setItem('tabValue', JSON.stringify(newValue));
    setTabValue(newValue);
  };

  useEffect(() => {
    // which tab were we on?
    const my_tabValue_str = localStorage.getItem('tabValue');
    if (my_tabValue_str?.length) {
      const my_tabValue = JSON.parse(my_tabValue_str);
      if (my_tabValue) {
        setTabValue(my_tabValue);
      }
    }
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {<Header currTab="Configure"/>}
      </header>
      <div className="mainContent">
          <Box 
            sx={{ 
              width: '800', 
              bgcolor: 'lightgray', 
              borderBottom: 1, 
              borderColor: 'divider',
            }}
          >
            <Tabs 
              value={tabValue}
              onChange={handleTabChange}
              aria-label="basic tabs example"
              variant="fullWidth"
              textColor="inherit"
              TabIndicatorProps={{
                style: {
                  backgroundColor: "black"
                }
              }}
              sx={{ padding: 0, margin: 0, height: 30, minHeight:30, width: 800}}>
              <Tab label="Categories" {...a11yProps(0)} className="TabButton" sx={{ padding: 0, margin: 0, height: 30, minHeight:30 }} />
              <Tab label="Key Words" {...a11yProps(1)} className="TabButton" sx={{ padding: 0, margin: 0, height: 30, minHeight:30 }} />
              <Tab label="Accounts" {...a11yProps(2)} className="TabButton" sx={{ padding: 0, margin: 0, height: 30, minHeight:30 }} />
              <Tab label="Database" {...a11yProps(3)} className="TabButton" sx={{ padding: 0, margin: 0, height: 30, minHeight:30 }} />
              <Tab label="PLAID" {...a11yProps(4)} className="TabButton" sx={{ padding: 0, margin: 0, height: 30, minHeight:30 }} />
            </Tabs>
          </Box>
          <CustomTabPanel tabValue={tabValue} index={0}>
            <ConfigCatEnv />
          </CustomTabPanel>
          <CustomTabPanel tabValue={tabValue} index={1}>
            <ConfigKeyword />
          </CustomTabPanel>
          <CustomTabPanel tabValue={tabValue} index={2}>
            <ConfigAccount />
          </CustomTabPanel>
          <CustomTabPanel tabValue={tabValue} index={3}>
            <ConfigDB />
          </CustomTabPanel>
          <CustomTabPanel tabValue={tabValue} index={4}>
            <ConfigPlaid />
          </CustomTabPanel>
      </div>
    </div>
  );
};

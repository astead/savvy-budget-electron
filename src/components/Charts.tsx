import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { channels } from '../shared/constants.js';
import { CategoryDropDown } from '../helpers/CategoryDropDown.tsx';
import Moment from 'moment';
import { LineChart } from '@mui/x-charts/LineChart';

export const Charts: React.FC = () => {
  
  interface EnvelopeList {
    envID: number; 
    category: string;
    envelope: string; 
  }


  interface ChartData {
    [key: string]: string | number | Date;
  }
  
  const [filterEnvList, setFilterEnvList] = useState<EnvelopeList[]>([]);
  const [filterEnvListLoaded, setFilterEnvListLoaded] = useState(false);
  const [filterEnvID, setFilterEnvID] = useState(null as any);
  const [filterEnvelopeName, setFilterEnvelopeName] = useState(null as any);

  const [haveChartData, setHaveChartData] = useState(false);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const handleFilterEnvChange = ({id, new_value, new_text}) => {
    setHaveChartData(false);
    setFilterEnvID(new_value);
    setFilterEnvelopeName(new_text);
  };

  const load_envelope_list = () => {
    
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_ENV_LIST);

    // Receive the data
    ipcRenderer.on(channels.LIST_ENV_LIST, (arg) => {
      setFilterEnvList([{
        envID: -2,
        category: "All",
        envelope: "", 
      },{
        envID: -1,
        category: "Undefined",
        envelope: "", 
      }, ...(arg as EnvelopeList[])]);
      setFilterEnvListLoaded(true);
      setFilterEnvelopeName("All");
      setFilterEnvID(-2);
      ipcRenderer.removeAllListeners(channels.LIST_ENV_LIST);
    });
  };

  const load_chart = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_ENV_CHART_DATA, filterEnvID );

    // Receive the data
    ipcRenderer.on(channels.LIST_ENV_CHART_DATA, (data) => {
      //setEnvList(arg as EnvelopeList[]);
      setChartData(data as ChartData[]);
      setHaveChartData(true);
      ipcRenderer.removeAllListeners(channels.LIST_ENV_CHART_DATA);
    });
  };

  useEffect(() => {
    if (chartData?.length > 0) {
      setHaveChartData(true);
    } else {
      setHaveChartData(false);
    }
  }, [chartData]);

  useEffect(() => {
    if (filterEnvID && filterEnvelopeName?.length) {
      load_chart();
    }
  }, [filterEnvID, filterEnvelopeName]);

  useEffect(() => {
    load_envelope_list();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {<Header currTab="Charts"/>}
      </header>
      <div className="mainContent">
        {filterEnvListLoaded &&
          <div className="import-container">
            <span>Filter: </span>
            <CategoryDropDown 
              id={-1}
              envID={filterEnvID}
              data={filterEnvList}
              changeCallback={handleFilterEnvChange}
            />
          </div>
        }
        {haveChartData && filterEnvelopeName &&
          <LineChart
            dataset={chartData}
            xAxis={[{ dataKey: 'month', label: 'Month', tickSize: 1, tickMinStep: 1}]}
            yAxis={[{position:'left'}]}
            series={[{ dataKey: 'totalAmt', label: filterEnvelopeName}]}
            width={500}
            height={300}

          />
        }

      </div>
    </div>
  );

}
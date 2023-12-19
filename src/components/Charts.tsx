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

  const [envList, setEnvList] = useState<EnvelopeList[]>([]);
  const [envListLoaded, setEnvListLoaded] = useState(false);
  const [envID, setEnvID] = useState(null);
  const [envelopeName, setEnvelopeName] = useState(null);
  const [haveChartData, setHaveChartData] = useState(false);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const handleChange = ({id, new_value, new_text}) => {
    setEnvID(new_value);
    setEnvelopeName(new_text);
  };

  const load_envelope_list = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_ENV_LIST);

    // Receive the data
    ipcRenderer.on(channels.LIST_ENV_LIST, (arg) => {
      setEnvList(arg as EnvelopeList[]);
      setEnvListLoaded(true);
      ipcRenderer.removeAllListeners(channels.LIST_ENV_LIST);
    });
  };

  const load_chart = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_ENV_CHART_DATA, {envID});

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
    load_chart();
  }, [envID]);

  useEffect(() => {
    load_envelope_list();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {<Header />}
      </header>
      <div>
        Charts<br/>
        {envListLoaded &&
          <CategoryDropDown 
            id={-1}
            envID={envID}
            data={envList}
            changeCallback={handleChange}
          />
        }
        {haveChartData && envelopeName &&
          <LineChart
            dataset={chartData}
            xAxis={[{ dataKey: 'month', label: 'Month', tickSize: 1, tickMinStep: 1}]}
            yAxis={[{position:'left'}]}
            series={[{ dataKey: 'totalAmt', label: envelopeName}]}
            width={500}
            height={300}

          />
        }

      </div>
    </div>
  );

}
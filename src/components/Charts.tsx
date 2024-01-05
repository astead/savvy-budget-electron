import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { channels } from '../shared/constants.js';
import { CategoryDropDown } from '../helpers/CategoryDropDown.tsx';
import { TimeFrameDropDown } from '../helpers/TimeFrameDropDown.tsx';
import { LineChart } from '@mui/x-charts/LineChart';
import { useParams } from 'react-router';


/*
  TODO:
  - month label seems off by 1 month
  - pie chart?
*/

export const Charts: React.FC = () => {
  
  const { envID } = useParams();

  interface EnvelopeList {
    envID: string; 
    category: string;
    envelope: string; 
  }

  interface ChartData {
    [key: string]: string | number | Date;
  }

  const [filterTimeFrame, setFilterTimeFrame] = useState<any[]>([]);
  const [filterTimeFrameLoaded, setFilterTimeFrameLoaded] = useState(false);
  const [filterTimeFrameID, setFilterTimeFrameID] = useState(1);

  const [filterEnvList, setFilterEnvList] = useState<EnvelopeList[]>([]);
  const [filterEnvListLoaded, setFilterEnvListLoaded] = useState(false);
  const [filterEnvID, setFilterEnvID] = useState(envID);
  const [filterEnvelopeName, setFilterEnvelopeName] = useState(null as any);

  const [haveChartData, setHaveChartData] = useState(false);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [avgValue, setAvgValue] = useState(0);

  const handleFilterEnvChange = ({id, new_value, new_text}) => {
    setHaveChartData(false);
    setFilterEnvID(new_value);
    setFilterEnvelopeName(new_text);
  };

  const handleFilterTimeFrameChange = ({id, new_value}) => {
    setHaveChartData(false);
    setFilterTimeFrameID(new_value);
  };

  const load_filter_timeframe = () => {
    setFilterTimeFrame([
      {
        id: 1,
        text: '1 Year', 
      },{
        id: 2,
        text: '2 Years', 
      },{
        id: 3,
        text: '3 Years', 
      },{
        id: 4,
        text: '4 Years', 
      },{
        id: 5,
        text: '5 Years', 
      },{
        id: 10,
        text: '10 Years', 
      },{
        id: 100,
        text: 'All', 
      }]);
    setFilterTimeFrameLoaded(true);
    setFilterTimeFrameID(1);
  }

  const load_envelope_list = () => {
    
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_ENV_LIST, {includeInactive: 1});

    // Receive the data
    ipcRenderer.on(channels.LIST_ENV_LIST, (arg) => {
      let groupedItems = [{
        envID: "env-3",
        category: "All",
        envelope: "", 
      },{
        envID: "env-2",
        category: "All Spending",
        envelope: "", 
      },{
        envID: "env-1",
        category: "Undefined",
        envelope: "", 
      }] as EnvelopeList[];

      let tmpItems = arg.map((item, index, itemArr) => {
        let node = {
          envID: "env"+item.envID,
          category: item.category,
          envelope: item.envelope, 
        };
        return node;
      });

      if (tmpItems.length > 0) {
        let cat = "";
        for (let i = 0; i < tmpItems.length; i++) {
          if (cat !== tmpItems[i].category) {
            cat = tmpItems[i].category;
            const node = {
              envID: "cat"+cat,
              category: "All " + tmpItems[i].category,
              envelope: "", 
            };
            tmpItems.splice(i, 0, node);
          }
        }
      }

      setFilterEnvList([...groupedItems, ...tmpItems]);

      setFilterEnvListLoaded(true);
      setFilterEnvelopeName("All");
      setFilterEnvID(envID);
      ipcRenderer.removeAllListeners(channels.LIST_ENV_LIST);
    });
  };

  const load_chart = () => {
    // Signal we want to get data
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send(channels.GET_ENV_CHART_DATA, {filterEnvID, filterTimeFrameID} );

    // Receive the data
    ipcRenderer.on(channels.LIST_ENV_CHART_DATA, (data) => {
      let totalValue = 0;
      
      const myChartData = data.reduce((acc, obj) => {
        // Find the existing entry for the date
        const existingEntry = acc.find((entry) => {
          return (
            (entry.month as Date)
              .toLocaleDateString('en-EN', {
                month: 'short',
                year: '2-digit',
              }) === 
            new Date(obj.month)
              .toLocaleDateString('en-EN', {
                month: 'short',
                year: '2-digit',
              })
          )
        });
      
        if (!obj.isBudget) {
          // Let's show spending as positive, it's easier to read in a chart,
          // and also compare against the budget.
          if (!filterEnvelopeName.includes("Income")) {
            obj.totalAmt = -1 * obj.totalAmt;
          }
          totalValue += obj.totalAmt;
        } else {
          // Let's show income budget values as positive, for the same
          // reason as above.
          if (filterEnvelopeName.includes("Income")) {
            obj.totalAmt = -1 * obj.totalAmt;
          }
        }

        if (existingEntry) {
          // Update existing entry
          if (obj.isBudget) {
            existingEntry.budgetTotals = obj.totalAmt;
          } else {
            existingEntry.actualTotals = obj.totalAmt;
          }
        } else {
          // Add a new entry
          acc.push({
            month: new Date(obj.month),
            actualTotals: obj.isBudget ? 0 : obj.totalAmt,
            budgetTotals: obj.isBudget ? obj.totalAmt : null,
          });
        }
      
        return acc;
      }, []);

      if (myChartData?.length) {
        setAvgValue(totalValue / myChartData?.length);
      }
      
      setChartData(myChartData as ChartData[]);
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
  }, [filterEnvID, filterEnvelopeName, filterTimeFrameID]);

  useEffect(() => {
    load_envelope_list();
    load_filter_timeframe();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {<Header currTab="Charts"/>}
      </header>
      <div className="mainContent">
        {filterEnvListLoaded &&
          <div className="chart-filter-container">
            <span>Envelope: </span>
            <CategoryDropDown 
              id={-1}
              envID={filterEnvID}
              data={filterEnvList}
              changeCallback={handleFilterEnvChange}
              className=""
            />
          </div>
        }
        {filterTimeFrameLoaded &&
          <div className="chart-filter-container">
            <span>Time: </span>
            <TimeFrameDropDown 
              id={1}
              time_id={filterTimeFrameID}
              data={filterTimeFrame}
              changeCallback={handleFilterTimeFrameChange}
              className=""
            />
          </div>
        }
        {haveChartData && filterEnvelopeName &&
          <div className="chartContainer">
          <LineChart
            dataset={chartData}
            xAxis={[
              { dataKey: 'month', 
                tickSize: 1, 
                tickMinStep: 1, 
                scaleType: 'time', 
                tickLabelStyle: {
                  angle: 270,
                  textAnchor: 'end',
                },
                valueFormatter: (date: Date) =>
                  date.toLocaleDateString('en-EN', {
                    month: 'short',
                    year: '2-digit',
                  }),
              }
            ]}
            yAxis={[
              { position:'left',
              }
            ]}
            series={[
              { 
                dataKey: 'actualTotals', 
                label: filterEnvelopeName,
                color: 'black',
              },
              { 
                dataKey: 'budgetTotals', 
                label: 'Budget'
              },
              { 
                data: chartData.map(d => avgValue) as number[], 
                label: 'Avg',
                showMark: false,
              },         
            ]}
            width={800}
            height={500}
          />
          </div>
        }

      </div>
    </div>
  );

}
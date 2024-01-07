import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Header } from './header.tsx';
import { channels } from '../shared/constants.js';
import { CategoryDropDown } from '../helpers/CategoryDropDown.tsx';
import { TimeFrameDropDown } from '../helpers/TimeFrameDropDown.tsx';
import { useParams } from 'react-router';
import Chart from "react-apexcharts";

/*
  TODO:
  - pie chart?
*/

export const Charts: React.FC = () => {
  
  const { in_envID } = useParams();

  interface EnvelopeList {
    envID: string; 
    category: string;
    envelope: string; 
  }

  interface ChartData {
    [key: string]: string | number | Date;
  }

  const navigate = useNavigate();
  const [navigateTo, setNavigateTo] = useState("");

  const [filterTimeFrame, setFilterTimeFrame] = useState<any[]>([]);
  const [filterTimeFrameLoaded, setFilterTimeFrameLoaded] = useState(false);
  const [filterTimeFrameID, setFilterTimeFrameID] = useState(1);

  const [filterEnvList, setFilterEnvList] = useState<EnvelopeList[]>([]);
  const [filterEnvListLoaded, setFilterEnvListLoaded] = useState(false);
  const [filterEnvID, setFilterEnvID] = useState(in_envID);
  const [filterEnvelopeName, setFilterEnvelopeName] = useState(null as any);

  const [haveChartData, setHaveChartData] = useState(false);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [chartOptions, setChartOptions] = useState(null as any);
  const [chartSeriesData, setChartSeriesData] = useState(null as any);

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
    ipcRenderer.send(channels.GET_CAT_ENV, {includeInactive: 1});

    // Receive the data
    ipcRenderer.on(channels.LIST_CAT_ENV, (arg) => {
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

      let tmpItems = arg.map((item) => {
        let node = {
          envID: "env"+item.envID,
          catID: "cat"+item.catID,
          category: item.category,
          envelope: item.envelope, 
        };
        return node;
      });

      if (tmpItems.length > 0) {
        let cat = '';
        for (let i = 0; i < tmpItems.length; i++) {
          if (cat !== tmpItems[i].category) {
            cat = tmpItems[i].category;
            const node = {
              envID: tmpItems[i].catID,
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
      setFilterEnvID(in_envID);
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

      let averageValue = 0 as number;
      if (myChartData?.length) {
        averageValue = totalValue / myChartData?.length;
      }
      
      setChartData(myChartData as ChartData[]);
      
      const xData = myChartData.map((item) => item.month);
      setChartOptions({
        xaxis: {
          categories: xData,
          labels: {
            formatter: function (value) {
              if (value) {
                return  new Date(value)
                .toLocaleDateString('en-EN', {
                  month: 'short',
                  year: '2-digit',
                })
              }
            }
          },
        },
        yaxis: {
          labels: {
            formatter: function (value) {
              if (value) {
                return value.toLocaleString('en-EN', {style: 'currency', currency: 'USD'});
              }
            }
          },
        },
        stroke: {
          curve: 'smooth',
          width: [4, 4, 2],
        },
        markers: { size: [ 4, 4, 0] },
        chart: { events:{ markerClick: handleClick } },
      });
      const yActual = myChartData.map((item) => item.actualTotals);
      const yBudget = myChartData.map((item) => item.budgetTotals);
      const yAverage = myChartData.map(() => averageValue);
      setChartSeriesData([
        { name: 'Actual', data: yActual, color: '#000000', markers: { size: 1 } },
        { name: 'Budget', data: yBudget, color: '#1a4297', markers: { size: 1 } },
        { name: 'Average', data: yAverage, color: '#c5c83a' },
      ]);
      setHaveChartData(true);

      ipcRenderer.removeAllListeners(channels.LIST_ENV_CHART_DATA);
    });
  };

  function handleClick(event, chartContext, { seriesIndex, dataPointIndex, config}) {
    if (seriesIndex === 0) {
      if (chartData[dataPointIndex]?.month) {
        const targetMonth = chartData[dataPointIndex]?.month as Date;
        
        let envID = -3;
        let catID = -1;
        if (filterEnvID) {
          if (filterEnvID.startsWith('env')) {
            envID = parseInt(filterEnvID.substring(3));
          } else if (filterEnvID.startsWith('cat')) {
            catID = parseInt(filterEnvID.substring(3));
          }

          setChartData([]);
          setChartOptions(null);
          setChartSeriesData(null);
          
          setNavigateTo("/Transactions" +
            "/" + catID + "/" + envID + 
            "/1/" + targetMonth.getFullYear() + 
            "/" + targetMonth.toLocaleDateString('en-EN', {month: 'numeric'}));
          
        } else {
          console.log("don't have filterEnvID: ");
        }
      } else {
        console.log("don't have month data for that data point, chartData: " + chartData  );
      }
    } else {
      console.log("clicked on wrong series.");
    }

  }

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
    if (!haveChartData && navigateTo) {
      navigate(navigateTo);
    }
  }, [haveChartData, navigateTo]);

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
            <Chart
              options={chartOptions}
              series={chartSeriesData}
              type="line"
              width="800"
            />
          </div>
        }

      </div>
    </div>
  );

}
// reactstrap components
import { Card, CardHeader, CardBody, Row, Col } from 'reactstrap';

import {
  updateTotalStats,
  getBarChatInfo,
  getParetoChartInfo,
  unifyDataCounts,
  filterDataCounts,
} from '../../utils';

import annotationPlugin from 'chartjs-plugin-annotation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

import { Bar } from 'react-chartjs-2';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);
ChartJS.register(annotationPlugin);

const DataGraph = ({
  graphName,
  stats,
  qualisFilter,
  showStatistics,
  end,
  init,
  areaData,
  isUnifiedChart = false,
  isParetoChart = false,
}) => {
  console.log('stats:', stats);

  let length = 0;
  const qualis = {};
  const dataCols = {};
  const dataCounts = {};
  const yearCounts = {};
  const totalStats = {};

  for (const name of Object.keys(stats)) {
    // console.log('name:', name);
    // console.log('stats[name]:', stats[name]);

    // Init data arrays
    length = stats[name].year.length;
    qualis[name] = {
      A1: Array(length).fill(0),
      A2: Array(length).fill(0),
      A3: Array(length).fill(0),
      A4: Array(length).fill(0),
      B1: Array(length).fill(0),
      B2: Array(length).fill(0),
      B3: Array(length).fill(0),
      B4: Array(length).fill(0),
      C: Array(length).fill(0),
      N: Array(length).fill(0),
    };

    dataCols[name] = Object.keys(qualis[name]);
    dataCounts[name] = {
      A: {},
      B: {},
      C: {},
      N: {},
      tot: {},
    };
    totalStats[name] = {};
    for (const key of Object.keys(dataCounts[name])) {
      totalStats[name][key] = {
        best: { count: 0, year: 0 },
        countList: [],
        yearList: [],
      };
    }
    for (const year of stats[name].year) {
      if (year >= init && year <= end) {
        for (const count of Object.keys(dataCounts[name])) {
          dataCounts[name][count][year] = 0;
        }
      }
    }

    // Get row datas
    for (let currYear = 0; currYear < stats[name].year.length; currYear++) {
      if (
        stats[name].year[currYear] >= init &&
        stats[name].year[currYear] <= end
      ) {
        // reset year counts
        yearCounts[name] = {};
        for (const count of Object.keys(dataCounts[name])) {
          yearCounts[name][count] = 0;
        }

        for (const key of dataCols[name]) {
          const keyChar = key.slice(0, 1);
          const value =
            areaData && areaData.scores && key in areaData.scores
              ? areaData.scores[key] * stats[name][key][currYear]
              : stats[name][key][currYear];
          dataCounts[name][keyChar][stats[name].year[currYear]] += value;
          yearCounts[name][keyChar] += value;
          yearCounts[name].tot += value;
        }

        totalStats[name] = updateTotalStats(
          totalStats[name],
          yearCounts[name],
          stats[name].year[currYear]
        );
      }
    }
  }

  console.log('dataCounts:', dataCounts);

  const filteredDataCounts = filterDataCounts(dataCounts, qualisFilter);
  console.log('filteredDataCounts:', filteredDataCounts);

  const unifiedDataCounts = isUnifiedChart
    ? unifyDataCounts(filteredDataCounts)
    : filteredDataCounts;
  console.log('unifiedDataCounts:', unifiedDataCounts);

  let xTitle = '';
  let yTitle = '';

  let graphicConfig;

  if (isParetoChart) {
    xTitle = `Autores mais produtivos (${init} - ${end})`;
    yTitle = 'Percentual acumulado da produção (estrato geral)';
    graphicConfig = getParetoChartInfo(unifiedDataCounts, xTitle, yTitle);

    // console.log('graphicConfig:', graphicConfig);

    return (
      <Row>
        <Col className="mb-5 mb-xl-0" xl="8">
          <Card className="shadow">
            <CardHeader className="bg-transparent">
              <Row className="align-items-center">
                <div className="col">
                  <h2 className="mb-0">{graphName}</h2>
                </div>
              </Row>
            </CardHeader>
            <CardBody>
              <div
                style={{
                  width: '100%',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                  minWidth: '500px',
                }}
              >
                <Line
                  data={graphicConfig.data}
                  options={graphicConfig.options}
                />
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    );
  } else {
    xTitle = 'Período';
    yTitle =
      qualisFilter.join('') === 'AB'
        ? 'Total de publicações (estrato geral)'
        : qualisFilter.join('') === 'A'
        ? 'Total de publicações (estrato restrito)'
        : '';

    const chartYears = stats[Object.keys(stats)[0]].year;
    const chartStats = totalStats[Object.values(totalStats)[0]];

    console.log('chartYears:', chartYears);
    console.log('chartStats:', chartStats);

    graphicConfig = getBarChatInfo(
      unifiedDataCounts,
      chartYears,
      chartStats,
      showStatistics,
      end,
      init,
      xTitle,
      yTitle,
      areaData,
      isUnifiedChart
    );

    // console.log('graphicConfig:', graphicConfig);

    return (
      <Row>
        <Col className="mb-5 mb-xl-0" xl="8">
          <Card className="shadow">
            <CardHeader className="bg-transparent">
              <Row className="align-items-center">
                <div className="col">
                  <h2 className="mb-0">{graphName}</h2>
                </div>
              </Row>
            </CardHeader>
            <CardBody>
              <div
                style={{
                  width: '100%',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                  minWidth: '500px',
                }}
              >
                <Bar
                  data={graphicConfig.data}
                  options={graphicConfig.options}
                />
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    );
  }
};

export default DataGraph;

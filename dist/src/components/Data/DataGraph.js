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
  showConsolidado = false,
  selectedCVs = [],
}) => {
  console.log('stats:', stats);

  function unifyTotalStats(totalStats) {
  const unified = {};

  // Pega as chaves (A, B, C, N, tot)
  for (const key of Object.keys(totalStats[Object.keys(totalStats)[0]])) {
    unified[key] = {
      best: { count: 0, year: 0 },
      countList: [],
      yearList: [],
    };
  }

  const allKeys = Object.keys(totalStats);
  const length = totalStats[allKeys[0]].tot.countList.length;

  for (let i = 0; i < length; i++) {
    for (const key of Object.keys(unified)) {
      let sum = 0;
      let year = 0;

      for (const curr of allKeys) {
        sum += totalStats[curr][key].countList[i] || 0;
        year = totalStats[curr][key].yearList[i] || year;
      }

      unified[key].countList.push(sum);
      unified[key].yearList.push(year);

      if (sum > unified[key].best.count) {
        unified[key].best.count = sum;
        unified[key].best.year = year;
      }
    }
  }

  return unified;
}


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
    let chartStats;

    if (Object.keys(totalStats).length > 1 && (isUnifiedChart || graphName.includes("Todos os currículos"))) {
      chartStats = unifyTotalStats(totalStats);
    } else {
      const firstKey = Object.keys(totalStats)[0];
      chartStats = totalStats[firstKey];
    }



    console.log('chartYears:', chartYears);
    console.log('chartStats:', chartStats);
    
    // se tiver mais de uma label (barra), usa as estatísticas de verdade
    // Conta quantas colunas (labels) têm pelo menos um valor > 0 em qualquer dataset
    const onlyGroupsSelected = selectedCVs.every(
      (item) => item.groupType === "Grupos"
    );
    
    const allGroupsHaveOneAuthor = selectedCVs.every(
      (item) => item.groupType === "Grupos" && item.authors.length === 1
    );
    
    const shouldShowStatistics = (
      showStatistics &&
      chartYears.length > 1 &&
      !(
        (showConsolidado && isUnifiedChart) ||
        (selectedCVs.length === 1 && isUnifiedChart) ||
        (onlyGroupsSelected && allGroupsHaveOneAuthor && isUnifiedChart)
      )
    );
    

    
    
    
    // agora refaz com estatísticas reais (ou falsas)
    graphicConfig = getBarChatInfo(
      unifiedDataCounts,
      chartYears,
      chartStats,
      shouldShowStatistics,
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

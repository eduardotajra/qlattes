// reactstrap components
import { Button, Card, CardHeader, CardBody, Row, Col } from 'reactstrap';
import React, { useEffect, useRef } from "react";
import jsPDF from 'jspdf';

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
  onTotalStatsReady = () => {},
}) => {
  console.log('stats:', stats);
  const chartRef = useRef(null);

  const handleExportChart = () => {
    // Cria PDF em landscape A4
    const doc = new jsPDF('landscape', 'pt', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    const titleSize = 16;
    const spacing = 10;
  
    // 1) Desenha o título no topo
    doc.setFontSize(titleSize);
    doc.setTextColor(65, 94, 152);
    doc.text(graphName, margin, margin);
  
    // 2) Pega o canvas do Chart.js e converte pra imagem
    const chart = chartRef.current;
    if (!chart) return;
    const canvas = chart.canvas;
    const imgData = canvas.toDataURL('image/png', 1.0);
  
    // 3) Calcula dimensões para caber na página
    const availableW = pageW - margin * 2;
    const imgProps = doc.getImageProperties(imgData);
    const imgH = (imgProps.height * availableW) / imgProps.width;
    const startY = margin + titleSize + spacing;
  
    // 4) Se passar da altura, cabeceia nova página
    if (startY + imgH > pageH - margin) {
      doc.addPage();
    }
  
    // 5) Desenha a imagem do gráfico
    doc.addImage(imgData, 'PNG', margin, startY, availableW, imgH);
  
    // 6) (Opcional) Adiciona rodapé com página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${i} de ${pageCount}`,
        pageW - margin,
        pageH - 10,
        { align: 'right' }
      );
    }
  
    // 7) Salva o PDF
    doc.save(`${graphName}.pdf`);
  };



  const handleExportPng = () => {
    const chart = chartRef.current;
    if (!chart) return;
    const canvas = chart.canvas;
    const imgData = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = imgData;
    link.download = `${graphName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
    console.log('name:', name);
    console.log('stats[name]:', stats[name]);

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

  useEffect(() => {
    if (typeof onTotalStatsReady === "function") {
      onTotalStatsReady(totalStats);
    }
  }, [JSON.stringify(totalStats)]);


  if (isParetoChart) {
    xTitle = `Autores mais produtivos (${init} - ${end})`;
    yTitle = 'Percentual acumulado da produção (estrato geral)';
    graphicConfig = getParetoChartInfo(unifiedDataCounts, xTitle, yTitle);

    // console.log('graphicConfig:', graphicConfig);

    return (
      <Row>
        <Col className="mb-5 mb-xl-0" xl="11">
          <Card className="shadow">
            <CardHeader className="bg-transparent">
              <Row className="align-items-center">
                <div className="col">
                  <h2 className="mb-0">{graphName}</h2>
                </div>
                <i color="primary" class="fa-solid fa-file-image pr-3" style={{cursor: "pointer" }}onClick={handleExportPng} title='Exportar gráfico (PNG)'></i>
                <i color="primary" class="fa-solid fa-file-pdf pr-3" style={{cursor: "pointer" }}onClick={handleExportChart} title='Exportar gráfico (PDF)'></i>
              </Row>
            </CardHeader>
            <CardBody>
              <div
                style={{
                  width: '100%',
                  height: '500px',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                  minWidth: '500px',
                }}
              >
                <Line
                  ref={chartRef}
                  data={graphicConfig.data}
                  options={{
                    ...graphicConfig.options,
                    responsive: true,           // encolhe/expande com o container
                    maintainAspectRatio: false, // ignora aspecto padrão
                  }}
                  redraw                         // força redraw ao redimensionar
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
    
    console.log(totalStats);
    console.log("Object.keys(totalStats).length: ", Object.keys(totalStats).length)
    chartStats = unifyTotalStats(totalStats);
    



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
        <Col className="mb-5 mb-xl-0" xl="11">
          <Card className="shadow">
            <CardHeader className="bg-transparent">
              <Row className="align-items-center">
                <div className="col">
                  <h2 className="mb-0">{graphName}</h2>
                </div>
                <i color="primary" class="fa-solid fa-file-image pr-3" style={{cursor: "pointer" }}onClick={handleExportPng} title='Exportar gráfico (PNG)'></i>
                <i color="primary" class="fa-solid fa-file-pdf pr-3" style={{cursor: "pointer" }}onClick={handleExportChart} title='Exportar gráfico (PDF)'></i>
              </Row>
            </CardHeader>
            <CardBody>
              <div
                style={{
                  width: '100%',
                  height: '500px',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                  minWidth: '500px',
                }}
              >
                <Bar
                  ref={chartRef}
                  data={graphicConfig.data}
                  options={{
                    ...graphicConfig.options,
                    responsive: true,           // encolhe/expande com o container
                    maintainAspectRatio: false, // ignora aspecto padrão
                  }}
                  redraw   
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

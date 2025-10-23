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
  groupMembersByName = {},
  paretoPorGrupo = false,
  showQuartisPareto = false,
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
    const ctx = canvas.getContext('2d');
  
    // 1. Desenha um fundo branco por baixo de tudo
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  
    // 2. Gera o PNG
    const imgData = canvas.toDataURL('image/png');
  
    // 3. Cria o link para download
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
    const palette = [
      'rgb(75, 192, 192)',
      'rgb(255, 99, 132)',
      'rgb(54, 162, 235)',
      'rgb(255, 159, 64)',
      'rgb(153, 102, 255)',
      'rgb(255, 205, 86)',
      'rgb(201, 203, 207)',
      'rgb(99, 255, 132)',
    ];

    // 1) Base SEMPRE por autor, e garanta allyears
    const countsByAuthor = {};
    for (const author of Object.keys(filteredDataCounts)) {
      countsByAuthor[author] = {};
      for (const key of Object.keys(filteredDataCounts[author])) {
        const obj = filteredDataCounts[author][key] || {};
        const allyears = ('allyears' in obj && typeof obj.allyears === 'number')
          ? obj.allyears
          : Object.values(obj).reduce((acc, v) => acc + (typeof v === 'number' ? v : 0), 0);
        countsByAuthor[author][key] = { ...obj, allyears };
      }
    }

    const fmtX = (v) => {
      if (v >= 99.5) return 100;
      if (v <= 0.5) return 0;
      return +v.toFixed(1);
    };

    // 2) Helper: curva Pareto a partir de um conjunto de autores (por nome)
    function makeParetoDataset(label, authorNames, color) {
      const rows = authorNames
        .filter(n => countsByAuthor[n])
        .map(name => {
          const total = Object.values(countsByAuthor[name])
            .reduce((s,e)=> s + (e?.allyears || 0), 0);
          return { name, total };
        })
        .filter(r => r.total > 0);

      if (rows.length === 0) {
        return {
          label,
          data: [{x:0,y:0,names:[]},{x:100,y:100,names:[]}],
          borderColor: color, backgroundColor: color,
          fill:false, borderWidth:2, tension:0.25, clip:false,
          pointRadius: (ctx)=> (ctx?.raw?.x===0?0:3),
          pointHoverRadius: (ctx)=> (ctx?.raw?.x===0?0:6),
          pointHitRadius:8, pointStyle:'circle'
        };
      }

      rows.sort((a,b)=> b.total - a.total);
      const n = rows.length;
      const totalAll = rows.reduce((s,r)=> s + r.total, 0);

      let run = 0;
      const rawPoints = [{x:0, y:0, names:[]}];
      rows.forEach((r, i) => {
        run += r.total;
        const x = +((((i+1)/n)*100).toFixed(1));
        const y = +(((run/totalAll)*100).toFixed(1));
        rawPoints.push({ x, y, names: [r.name] });
      });
      // só fecha em (100,100) se não chegou naturalmente
      if (rawPoints[rawPoints.length-1].x !== 100 || rawPoints[rawPoints.length-1].y !== 100) {
        rawPoints.push({ x:100, y:100, names:[] });
      }

      // AGRUPA pontos idênticos (mesmo x,y) juntando os nomes
      const key = (p) => `${p.x}|${p.y}`;
      const grouped = new Map();
      rawPoints.forEach(p => {
        const k = key(p);
        if (!grouped.has(k)) grouped.set(k, { x: p.x, y: p.y, names: [...(p.names||[])] });
        else {
          const g = grouped.get(k);
          g.names.push(...(p.names||[]));
        }
      });

      const points = Array.from(grouped.values());

      return {
        label,
        data: points,
        borderColor: color, backgroundColor: color,
        fill:false, borderWidth:2, tension:0.25, clip:false,
        pointRadius: (ctx)=> (ctx?.raw?.x===0?0:3),
        pointHoverRadius: (ctx)=> (ctx?.raw?.x===0?0:6),
        pointHitRadius:8, pointStyle:'circle'
      };
    }


    // 3) Se houver 2+ grupos informados, plote multi-linha; senão, uma única curva
    const selectedGroups = selectedCVs.filter(it => it.groupType === "Grupos");
    const temGruposSuficientes =
      selectedGroups.length >= 2 &&
      groupMembersByName &&
      Object.keys(groupMembersByName).length >= 2;

    // multi-séries apenas se a checkbox estiver ON e houver grupos válidos
    const multiGroup = paretoPorGrupo && temGruposSuficientes;

    let datasets = [];
    if (multiGroup) {
      // curvas por grupo (uma linha por grupo)
      const groupNames = Object.keys(groupMembersByName);
      groupNames.forEach((gName, idx) => {
        const members = (groupMembersByName[gName] || []).filter(Boolean);
        const ds = makeParetoDataset(gName, members, palette[idx % palette.length]);
        if (ds.data && ds.data.length >= 2) datasets.push(ds);
      });
    } else {
      // curva única juntando todos os autores
      const allAuthors = Object.keys(countsByAuthor);
      const ds = makeParetoDataset('', allAuthors, palette[0]);
      datasets = [ds];
    }


        // 3.1) Dataset fixo de referência (Caso ótimo)
    const datasetCasoOtimo = {
      label: 'Caso ótimo',
      data: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      borderColor: 'rgba(150,150,150,0.9)',
      borderDash: [6, 6],
      pointRadius: 0,
      fill: false,
      borderWidth: 1.5,
      clip: false,
      // flag auxiliar para filtrar da legenda
      _isReference: true,
    };


    // 3.3) Empilha o dataset de referência por último (fica visível sem poluir)
    datasets.push(datasetCasoOtimo);

    // 4) Anotações (quartis) — só quando a checkbox estiver ligada
        // 4) Anotações (quartis) — só quando a checkbox estiver ligada
    // OBS: ordem de inserção agora é Q4 → Q3 → Q2 → Q1 (como solicitado)
    // Paleta base (mantém seu azul #415e98)
    const Q_BASE = '65,94,152';

    // 1) Faixas de quartil (Q4 → Q3 → Q2 → Q1) com borda e borda arredondada
    // Quartis no estilo de referência (Q1 & Q3 cinza; Q2 & Q4 transparente; rótulos “Nº Quartil”)
    const quartileBoxes = showQuartisPareto ? {
      q4_quartiles: {
        type: 'box',
        xScaleID: 'x', yScaleID: 'y',
        xMin: 0,    xMax: 25,
        yMin: 0,    yMax: 101,
        drawTime: 'beforeDatasetsDraw',
        backgroundColor: 'rgba(229, 231, 235, 0.5)',   // cinza claro
        borderWidth: 0,
        borderColor: 'transparent',
        display: true,
        z: 1,
        label: {
          content: '4º Quartil',
          position: { x: 'center', y: 'start' },
          color: 'rgba(0, 0, 0, 0.7)',
          enabled: true,
          display: true,
          font: { size: 11, weight: 'bold' },
        },
      },
      q3_quartiles: {
        type: 'box',
        xScaleID: 'x', yScaleID: 'y',
        xMin: 25,   xMax: 50,
        yMin: 0,    yMax: 101,
        drawTime: 'beforeDatasetsDraw',
        backgroundColor: 'rgba(255, 255, 255, 0)',     // transparente
        borderWidth: 0,
        borderColor: 'transparent',
        display: true,
        z: 2,
        label: {
          content: '3º Quartil',
          position: { x: 'center', y: 'start' },
          color: 'rgba(0, 0, 0, 0.7)',
          enabled: true,
          display: true,
          font: { size: 11, weight: 'bold' },
        },
      },
      q2_quartiles: {
        type: 'box',
        xScaleID: 'x', yScaleID: 'y',
        xMin: 50,   xMax: 75,
        yMin: 0,    yMax: 101,
        drawTime: 'beforeDatasetsDraw',
        backgroundColor: 'rgba(229, 231, 235, 0.5)',   // cinza claro
        borderWidth: 0,
        borderColor: 'transparent',
        display: true,
        z: 3,
        label: {
          content: '2º Quartil',
          position: { x: 'center', y: 'start' },
          color: 'rgba(0, 0, 0, 0.7)',
          enabled: true,
          display: true,
          font: { size: 11, weight: 'bold' },
        },
      },
      q1_quartiles: {
        type: 'box',
        xScaleID: 'x', yScaleID: 'y',
        xMin: 75,   xMax: 100,
        yMin: 0,    yMax: 101,
        drawTime: 'beforeDatasetsDraw',
        backgroundColor: 'rgba(255, 255, 255, 0)',     // transparente
        borderWidth: 0,
        borderColor: 'transparent',
        display: true,
        z: 4,
        label: {
          content: '1º Quartil',
          position: { x: 'center', y: 'start' },
          color: 'rgba(0, 0, 0, 0.7)',
          enabled: true,
          display: true,
          font: { size: 11, weight: 'bold' },
        },
      },
    } : {};


    // 2) Separadores verticais (25/50/75%) discretos
    const quartileSeparators = showQuartisPareto ? {
      qSep25: {
        type: 'line', xScaleID: 'x', yScaleID: 'y',
        xMin: 25, xMax: 25, yMin: 0, yMax: 101,
        borderColor: `rgba(${Q_BASE},0.25)`, borderDash: [4,4], borderWidth: 1, z: 5
      },
      qSep50: {
        type: 'line', xScaleID: 'x', yScaleID: 'y',
        xMin: 50, xMax: 50, yMin: 0, yMax: 101,
        borderColor: `rgba(${Q_BASE},0.25)`, borderDash: [4,4], borderWidth: 1, z: 5
      },
      qSep75: {
        type: 'line', xScaleID: 'x', yScaleID: 'y',
        xMin: 75, xMax: 75, yMin: 0, yMax: 101,
        borderColor: `rgba(${Q_BASE},0.25)`, borderDash: [4,4], borderWidth: 1, z: 5
      },
    } : {};

    // 3) “Pílulas” de rótulo dos quartis (topo, centradas em cada faixa)
    


    const options = {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      plugins: {
        legend: {
          display: multiGroup,
          labels: {
            // Oculta "Caso ótimo" da legenda
            filter: (item, data) => {
              const ds = data?.datasets?.[item.datasetIndex];
              return ds && ds.label !== 'Caso ótimo' && !ds._isReference;
            }
          }
        },
        tooltip: {
          mode: 'nearest',
          intersect: true,
          callbacks: {
            title: (items) => {
              const ctx   = items?.[0];
              const chart = ctx?.chart;
              const x0    = ctx?.parsed?.x;
              const y0    = ctx?.parsed?.y;
              if (!chart || x0 == null || y0 == null) return '';
              const EPS = 0.2;
              const labels = [];
              chart.data.datasets.forEach((ds) => {
                (ds.data || []).forEach((p) => {
                  const px = (p?.x ?? p?.parsed?.x);
                  const py = (p?.y ?? p?.parsed?.y);
                  if (px == null || py == null) return;
                  if (Math.abs(px - x0) <= EPS && Math.abs(py - y0) <= EPS) {
                    const arr = Array.isArray(p.names) ? p.names : (p.name ? [p.name] : []);
                    if (arr.length) {
                      if ((chart.options?.plugins?.legend?.display) && ds.label && ds.label !== 'Caso ótimo') {
                        labels.push(`${ds.label}: ${arr.join(', ')}`);
                      } else {
                        labels.push(...arr);
                      }
                    }
                  }
                });
              });
              return labels.length ? labels : '';
            },
            label: (item) => {
              const raw = item.raw || {};
              const fmtX = (v) => {
                if (v >= 99.5) return 100;
                if (v <= 0.5) return 0;
                return +v.toFixed(1);
              };
              const shownX = fmtX(raw.labelX ?? raw.x);
              return `Posição: ${shownX}% | Acum.: ${raw.y}%`;
            }
          }
        },
        // Quartis (quando habilitados)
        annotation: {
          annotations: showQuartisPareto
            ? { 
                ...quartileBoxes,       // faixas
                ...quartileSeparators,  // linhas
              }
            : {}
        }
      },
      layout: { padding: { right: 4, top: 2 } },
      scales: {
        x: {
          type: 'linear',
          min: 0, max: 100.5, suggestedMax: 100.5,
          title: { display: true, text: 'Percentual dos autores mais produtivos' },
          afterBuildTicks(scale) {
            scale.ticks = Array.from({ length: 11 }, (_, i) => ({ value: i * 10 }));
          },
          ticks: { callback: (v) => `${v}%`, stepSize: 10, font: { size: 10 } },
          grid: { drawOnChartArea: false }
        },
        y: {
          beginAtZero: true,
          max: 101, suggestedMax: 101,
          title: { display: true, text: 'Percentual acumulado da produção (estrato geral)' },
          afterBuildTicks(scale) {
            scale.ticks = Array.from({ length: 11 }, (_, i) => ({ value: i * 10 }));
          },
          ticks: { callback: (v) => `${v}%`, stepSize: 10 }
        }
      }
    };

    return (
      <Row>
        <Col className="mb-5 mb-xl-0" xl="11">
          <Card className="shadow">
            <CardHeader className="bg-transparent">
              <Row className="align-items-center">
                <div className="col">
                  <h2 className="mb-0">{graphName}</h2>
                </div>
                <i className="fa-solid fa-file-image pr-3" style={{cursor: "pointer" }} onClick={handleExportPng} title='Exportar gráfico (PNG)'></i>
                <i className="fa-solid fa-file-pdf pr-3" style={{cursor: "pointer" }} onClick={handleExportChart} title='Exportar gráfico (PDF)'></i>
              </Row>
            </CardHeader>
            <CardBody>
              <div style={{ width:'100%', height:'500px', overflowX:'auto', whiteSpace:'nowrap', minWidth:'500px' }}>
                <Line
                  ref={chartRef}
                  data={{ datasets }}
                  options={{ ...options, responsive:true, maintainAspectRatio:false }}
                  redraw
                />
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    );
  }else {
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

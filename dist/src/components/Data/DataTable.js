import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';


// reactstrap components
import {
  Button,
  Card,
  CardHeader,
  Row,
  Col,
} from "reactstrap";

import {
  linearRegression,
  roundNumber,
  arrayMean,
  arrayMedian
} from "../../utils"

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { TableVirtuoso } from 'react-virtuoso';

const DataTable = ({
  tableName,
  init,
  end,
  stats,
  showStatistics,
  areaData,
  unified,
  type
}) => {
  if (!stats || !stats.year || !Array.isArray(stats.year)) {
    console.error("stats.year está indefinido ou mal formatado", stats);
    return null;
  }
  const isScoreTable = Boolean(areaData && areaData.scores && Object.keys(areaData.scores).length > 0);

  
  init = Number(init);
  end = Number(end);

  // Init data arrays
  const years = stats.year.length === 1 ? stats.year : stats.year.filter(year => year >= init && year <= end).map(year => year.toString());
  const qualis = {
    A1: Array(years.length).fill(0),
    A2: Array(years.length).fill(0),
    A3: Array(years.length).fill(0),
    A4: Array(years.length).fill(0),
    B1: Array(years.length).fill(0),
    B2: Array(years.length).fill(0),
    B3: Array(years.length).fill(0),
    B4: Array(years.length).fill(0),
    C: Array(years.length).fill(0),
    N: Array(years.length).fill(0),
  }
  const totals = {
    A: Array(years.length).fill(0),
    B: Array(years.length).fill(0),
    all: Array(years.length).fill(0)
  };
  const percentages = {
    A: Array(years.length).fill(0),
    B: Array(years.length).fill(0),
  };
  const totalStats = {
    A1: 0,
    A2: 0,
    A3: 0,
    A4: 0,
    B1: 0,
    B2: 0,
    B3: 0,
    B4: 0,
    C: 0,
    N: 0,
    '#A': 0,
    '#B': 0,
    '#all': 0,
    '%A': 0,
    '%B': 0,
  }

  // Reset total statistics
  let statistics = {};
  for (const key of ['#A', '#B', '#all', '%A', '%B']) {
    statistics[key] = {
      best: { count: 0, year: 0 },
      countList: [],
      yearList: [],
    };
  }

  // Get row datas
  for (let currYear = 0; currYear < years.length; currYear++) {
    // se o ano do stats nao estiver no meio do intervalo, pula
    if (stats.year[currYear] < init && stats.year[currYear] > end) continue;
    
    // create cells with data cols
    for (const key of Object.keys(qualis)) {
      const keyChar = key.slice(0, 1);

      // value
      const currentValue = (areaData && areaData.scores && key in areaData.scores)
        ? areaData.scores[key]*stats[key][currYear] : stats[key][currYear];

      // Qualis columns
      qualis[key][currYear] = currentValue;

      // Total columns
      totals.all[currYear] += currentValue;
      if (['A', 'B'].includes(keyChar)) {
        totals[keyChar][currYear] += currentValue;
        percentages[keyChar][currYear] += currentValue;
      }

      // Total row
      totalStats[key] += currentValue;
      totalStats['#all'] += currentValue;
      if (['A', 'B'].includes(keyChar)) {
        totalStats['#'+keyChar] += currentValue;
        totalStats['%'+keyChar] += currentValue;
      }
    }

    percentages.A[currYear] = totals.all[currYear]===0 ? 0 : (percentages.A[currYear]/totals.all[currYear]*100);
    percentages.B[currYear] = totals.all[currYear]===0 ? 0 : (percentages.B[currYear]/totals.all[currYear]*100);

    // Update statistics
    const yearCounts = {
      '#A': totals.A[currYear],
      '#B': totals.B[currYear],
      '#all': totals.all[currYear],
      '%A': percentages.A[currYear],
      '%B': percentages.B[currYear]
    };
    for (const key of Object.keys(statistics)) {
      // update total stats lists
      statistics[key].countList = statistics[key].countList || [];
      statistics[key].yearList.push(stats.year[currYear]);
      statistics[key].countList.push(yearCounts[key]);


      // update total stats best
      if (yearCounts[key] >= statistics[key].best.count) {
        statistics[key].best.count = yearCounts[key];
        statistics[key].best.year = stats.year[currYear];
      }
    }
  }
  
  // Create header from data arrays
  const header = [stats.year.length === 1 ? "Período" : "Ano"].concat(Object.keys(qualis))
    .concat(Object.keys(totals).map(item => item === "all" ? "Total" : "Tot " + item))
    .concat(Object.keys(percentages).map(item => "% " + item));
  const headerLegend = areaData && areaData.scores && [""].concat(Object.keys(qualis).map(item => areaData.scores[item]))
    .concat(Object.keys(totals).map(item => ""))
    .concat(Object.keys(percentages).map(item => ""));

  // Create footer from data arrays
  const footer = (unified ? [`${init} - ${end}`] : ["Total"]).concat(
    Object.entries(totalStats).map(([key, number]) => {
      if (key === '%A') return roundNumber(totalStats['#A'] / totalStats['#all'] * 100);
      if (key === '%B') return roundNumber(totalStats['#B'] / totalStats['#all'] * 100);
      return roundNumber(number);
    })
  );

  const handleExportTable = () => {
    const doc = new jsPDF('p', 'pt', 'a4');
  
    // 1) corpo principal: todas as linhas de anos
    const body = years.map((yr, i) => [
      yr,
      ...Object.keys(qualis).map(k => roundNumber(qualis[k][i])),
      ...['A','B','all'].map(k => roundNumber(totals[k][i])),
      ...['A','B'].map(k => roundNumber(percentages[k][i])),
    ]);
  
    // 2) Estatísticas: você já tem estes arrays calculados lá embaixo do seu componente
    //    Eles têm o formato exato para cada coluna: ["Média", "", "", ..., valorA, valorB, ...]
    const statsRows = [
      mean,
      median,
      trend,
      bestYear
    ];
  
    // 3) linha de total global (antes era o "footer")
    const totalRow = [
      unified ? `${init}–${end}` : 'Total',
      ...Object.entries(totalStats).map(([k, v]) =>
        k === '%A'
          ? roundNumber(totalStats['#A'] / totalStats['#all'] * 100)
        : k === '%B'
          ? roundNumber(totalStats['#B'] / totalStats['#all'] * 100)
        : roundNumber(v)
      )
    ];
  
    // 4) monta o fullBody: dados + espaço + total global + espaço + estatísticas
    const fullBody = unified?[
      ...body,
      totalRow,
    ] : [
      ...body,
      [],
      totalRow,
      [],
      ...statsRows
    ];
  
    // 5) chama o autoTable passando o fullBody
    autoTable(doc, {
      head: [header],
      body: fullBody,
      startY: 60,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 4,
        textColor: 0,
      },
      headStyles: {
        fillColor: [65, 94, 152],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      },
      didDrawPage: data => {
        doc.setFontSize(14);
        doc.setTextColor(65, 94, 152);
        doc.text(tableName, data.settings.margin.left, 30);
      }
    });
  
    // 6) salva o PDF
    doc.save(`${tableName}.pdf`);
  };



  const handleExportCsv = () => {
    // Gera os mesmos dados do PDF em uma matriz de arrays
    const body = years.map((yr, i) => [
      yr,
      ...Object.keys(qualis).map(k => roundNumber(qualis[k][i])),
      ...['A','B','all'].map(k => roundNumber(totals[k][i])),
      ...['A','B'].map(k => roundNumber(percentages[k][i])),
    ]);
    const totalRow = [
      unified ? `${init}–${end}` : 'Total',
      ...Object.entries(totalStats).map(([k, v]) =>
        k === '%A'
          ? roundNumber(totalStats['#A'] / totalStats['#all'] * 100)
        : k === '%B'
          ? roundNumber(totalStats['#B'] / totalStats['#all'] * 100)
        : roundNumber(v)
      )
    ];
    const mn = mean
    mn[0] = 'Media'
    const td = trend
    td[0] = 'Tendencia'
    const by = bestYear
    by[0] = 'Melhor_Ano'
    const fullBodyCsv = unified
      ? [...body, totalRow]
      : [...body, totalRow, mn, median, td, by];
    const rows = [header, ...fullBodyCsv];
    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${tableName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  
  const handleExportXlsx = () => {
    // Mesma matriz de dados para XLSX
    const body = years.map((yr, i) => [
      yr,
      ...Object.keys(qualis).map(k => roundNumber(qualis[k][i])),
      ...['A','B','all'].map(k => roundNumber(totals[k][i])),
      ...['A','B'].map(k => roundNumber(percentages[k][i])),
    ]);
    const totalRow = [
      unified ? `${init}–${end}` : 'Total',
      ...Object.entries(totalStats).map(([k, v]) =>
        k === '%A'
          ? roundNumber(totalStats['#A'] / totalStats['#all'] * 100)
        : k === '%B'
          ? roundNumber(totalStats['#B'] / totalStats['#all'] * 100)
        : roundNumber(v)
      )
    ];
    const fullBodyXlsx = unified
      ? [...body, totalRow]
      : [...body, [], totalRow, [], mean, median, trend, bestYear];
    // Cria workbook e sheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([header, ...fullBodyXlsx]);
    XLSX.utils.book_append_sheet(wb, ws, tableName);
    XLSX.writeFile(wb, `${tableName}.xlsx`);
  };
  
  


  // Função para calcular a média de um array
  function mean1(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((acc, val) => acc + val, 0) / arr.length;
  }
  // Função para calcular a mediana de um array
  function median1(arr) {
    if (arr.length === 0) return 0;
    const sortedArr = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sortedArr.length / 2);
    
    return sortedArr.length % 2 !== 0 ? sortedArr[mid] : (sortedArr[mid - 1] + sortedArr[mid]) / 2;
  }



  // Get statistics
  const mean = ["Média"].concat(Object.keys(qualis).map(item => ""));
  console.log("Média:", mean)
  const median = ["Mediana"].concat(Object.keys(qualis).map(item => ""));
  console.log("Mediana:", median)
  const trend = ["Tendência"].concat(Object.keys(qualis).map(item => ""));
  console.log("Tendência:", trend)
  const bestYear = ["Melhor ano"].concat(Object.keys(qualis).map(item => ""));
  console.log("Melhor Ano:", bestYear)
  for (const col of Object.keys(statistics)) {
    console.log(statistics[col])
    mean.push(statistics[col].countList.length === 0 ? 0 : mean1(statistics[col].countList).toFixed(2));
    console.log(mean1(statistics[col].countList).toFixed(2))
    median.push(statistics[col].countList.length === 0 ? 0 : median1(statistics[col].countList).toFixed(2));
    console.log(median1(statistics[col].countList).toFixed(2))
    trend.push(statistics[col].countList.length === 0 ? 0 : linearRegression(statistics[col].yearList, statistics[col].countList).slope.toFixed(2));
    console.log(linearRegression(statistics[col].yearList, statistics[col].countList).slope.toFixed(2))
    bestYear.push(statistics[col].best.year > 0 ? statistics[col].best.year : '');
  }
  

  // Set rows
  // Sempre mapeia as linhas em `years`; no caso unificado, `years` = ['']
  const rows = unified && !isScoreTable ?
  []:
  years.map((year, index) => (
    <React.Fragment key={year || index}>
      <TableCell scope="row">{year}</TableCell>
      {Object.values(qualis).map((col, i) => (
        <TableCell key={i}>{roundNumber(col[index])}</TableCell>
      ))}
      {Object.values(totals).map((col, i) => (
        <TableCell key={`t${i}`}>{roundNumber(col[index])}</TableCell>
      ))}
      {Object.values(percentages).map((col, i) => (
        <TableCell key={`p${i}`}>{roundNumber(col[index])}</TableCell>
      ))}
    </React.Fragment>
  )).reverse();

  
  const shouldShowStatistics = showStatistics && !unified && stats.year.length > 1;


  // Set Table Height
  const tableHeight = `${shouldShowStatistics ? Math.min(636, rows.length * 53 + 320) : Math.min(424, rows.length * 53 + 108)}px !important`;

  
  return (
    <Row>
      <Col className="mb-5 mb-xl-0" xl="11">
        <Card className="shadow" style={{ marginBottom: '2rem' }}>
          <CardHeader className="border-0">
            <Row className="align-items-center">
              <div className="col d-flex align-items-center">
              <h3 className="mb-0 mr-2">
                {type === "Grupo" && <i className="fa-solid fa-users mr-2" style={{ color: "#415e98" }}></i>}
                {type === "Autor" && <i className="fas fa-user mr-2" style={{ color: "#415e98" }}></i>}
                {tableName}
              </h3>
              </div>
              <i color="primary" class="fa-solid fa-file-excel pr-3" style={{cursor: "pointer" }}onClick={handleExportXlsx} title='Exportar tabela (XLSX)'></i>
              <i color="primary" class="fa-solid fa-file-csv pr-3" style={{cursor: "pointer" }}onClick={handleExportCsv} title='Exportar tabela (CSV)'></i>
              <i color="primary" class="fa-solid fa-file-pdf pr-3" style={{cursor: "pointer" }}onClick={handleExportTable} title='Exportar tabela (PDF)'></i>
            </Row>
          </CardHeader>
          <TableVirtuoso
            data={rows}
            components={{
              Scroller: React.forwardRef((props, ref) => ( <TableContainer component={Paper} {...props} ref={ref} /> )),
              Table: (props) => ( <Table {...props} sx={{ borderCollapse: 'separate', tableLayout: 'fixed' }} /> ),
              TableHead,
              TableRow: ({ item: _item, ...props }) => <TableRow {...props} />,
              TableBody: React.forwardRef((props, ref) => ( <TableBody {...props} ref={ref} /> )),
            }}
            itemContent={ (_index, row) => row}
            fixedHeaderContent={() => {
              return (<>
                <TableRow >
                  {header.map((item, index) =>
                    <TableCell 
                      scope="col"
                      style={{ borderBottom: 'none', width: index === 0 ? 110 : 50 }}
                      variant="head"
                      align={'left'}
                      sx={{
                        backgroundColor: '#F6F9FC',
                      }}
                    >
                      {item}
                    </TableCell>)
                  }
                </TableRow>
                {typeof areaData !== 'undefined' &&
                  <TableRow
                    sx={{
                      backgroundColor: '#F6F9FC',
                    }}
                  >
                    {Array.isArray(headerLegend) && headerLegend.map(item => <TableCell scope="col" style={{borderTop: 'none'}}>{item}</TableCell>)}
                  </TableRow>
                }
              </>);
            }}
            fixedFooterContent={() => {
              const shouldShowStatistics = showStatistics && !unified && stats.year.length > 1;

              return ( <>
                <TableRow
                  sx={{
                    backgroundColor: '#F6F9FC',
                  }}
                >
                  {footer.map(item => <TableCell scope="col" style={{ borderBottom: 'none' }}>{item}</TableCell>)}
                </TableRow>
                {shouldShowStatistics && (<>
                  <TableRow
                    sx={{
                      backgroundColor: '#F6F9FC',
                    }}
                  >
                    {mean.map(item => <TableCell scope="col" style={{ borderTop: 'none', borderBottom: 'none' }}>{item}</TableCell>)}
                  </TableRow>
                  <TableRow
                    sx={{
                      backgroundColor: '#F6F9FC',
                    }}
                  >
                    {median.map(item => <TableCell scope="col" style={{ borderTop: 'none', borderBottom: 'none' }}>{item}</TableCell>)}
                  </TableRow>
                  <TableRow
                    sx={{
                      backgroundColor: '#F6F9FC',
                    }}
                  >
                    {trend.map(item => <TableCell scope="col" style={{ borderTop: 'none', borderBottom: 'none' }}>{item}</TableCell>)}
                  </TableRow>
                  <TableRow
                    sx={{
                      backgroundColor: '#F6F9FC',
                    }}
                  >
                    {bestYear.map(item => <TableCell scope="col" style={{ borderTop: 'none', borderBottom: 'none' }}>{item}</TableCell>)}
                  </TableRow>
                </>)}
              </>);
            }}
            sx={{
              height: tableHeight,
              boxShadow: '0 0 2rem 0 rgba(136,152,170,.15)!important'
            }}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default DataTable;

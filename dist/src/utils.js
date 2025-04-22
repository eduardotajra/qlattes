/*global chrome*/
import pattern from 'patternomaly';

/**
 * Mathematical util functions
 */

// calculate the max, sum, mean, and median of an array
export function arrayMax(arr) {
  return Math.max.apply(null, arr);
}

export function arraySum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

export function arrayMean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((acc, val) => acc + val, 0) / arr.length;
}

export function arrayMedian(arr) {
  if (arr.length === 0) return 0;
  const mid = Math.floor(arr.length / 2);
  const sorted = arr.slice().sort((a, b) => a - b);
  return arr.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// sort an array of objects by their keys
export function sortArrayByKeys(arr, keys) {
  const sortedArray = arr.slice();
  for (const key of keys.reverse()) {
    sortedArray.sort((a, b) => (a[key] < b[key] ? -1 : 1));
  }
  return sortedArray;
}

// sort an array of objects by their keys
export function sortArrayByKeysReverse(arr, keys) {
  const sortedArray = arr.slice();
  for (const key of keys.reverse()) {
    sortedArray.sort((a, b) => (a[key] > b[key] ? -1 : 1));
  }
  return sortedArray;
}

// linear regression implementation based on code from https://github.com/heofs/trendline/
// linear regression implementation
export function linearRegression(xData, yData) {
  xData = xData.map((xItem) => Number(xItem));
  // average of X values and Y values
  const xMean = arrayMean(xData);
  const yMean = arrayMean(yData);

  // Subtract X or Y mean from corresponding axis value
  const xMinusxMean = xData.map((val) => val - xMean);
  const yMinusyMean = yData.map((val) => val - yMean);

  const xMinusxMeanSq = xMinusxMean.map((val) => Math.pow(val, 2));

  const xy = [];
  for (let x = 0; x < xData.length; x++) {
    xy.push(xMinusxMean[x] * yMinusyMean[x]);
  }

  // Usar reduce() para calcular a soma
  const xySum = xy.reduce((acc, val) => acc + val, 0);
  const xMinusxMeanSqSum = xMinusxMeanSq.reduce((acc, val) => acc + val, 0);

  // b1 is the slope
  const b1 = xySum / xMinusxMeanSqSum;
  // b0 is the start of the slope on the Y axis
  const b0 = yMean - b1 * xMean;

  return {
    slope: b1,
    yStart: b0,
    calcY: (x) => b0 + b1 * x,
  };
}

export const roundNumber = (number) => {
  return number.toString().indexOf('.') !== -1 ? number.toFixed(1) : number;
};

/**
 * String manipulation functions
 */

/**
 * Fetch URL functions
 */

async function fetchJSON(url) {
  var json = [];

  // fetch url
  const response = await fetch(url);

  // check response status
  if (response.status === 200) {
    // get response contents
    json = await response.json();
  } else {
    // log response status code and text
    console.log(response.status);
    console.log(response.statusText);
  }

  return json;
}

/**
 * Data functions - CRUD
 */

export async function getLattesData() {
  const lattesData = await chrome.storage.local.get('lattes_data');

  return lattesData['lattes_data'] || {};
}

export async function getAuthorData(author) {
  const lattesData = await getLattesData();

  return lattesData[author];
}

export async function getAreasData() {
  const areasData = await fetchJSON(
    chrome.runtime.getURL('data/qualis-scores-by-area-2017-2020.json')
  );

  return areasData || [];
}

export async function getGroups() {
  let groupsData = await chrome.storage.local.get('groupData');
  return groupsData['groupData'] || {};
}

export async function getArea() {
  const areaData = await chrome.storage.local.get(['area_data']);

  return areaData['area_data'] || {};
}

export async function addNewGroup(groupName, authors) {
  const groupsData = await getGroups();
  const ids = Object.keys(groupsData);

  const lastId = ids.length === 0 ? 0 : ids[Object.keys(groupsData).length - 1];
  groupsData[Number(lastId) + 1] = {
    name: groupName,
    authors: authors,
  };

  // Save it back
  await chrome.storage.local.set({ groupData: groupsData });
}

export async function deleteGroup(group) {
  const groupsData = await getGroups();

  delete groupsData[group];

  // Save it back
  await chrome.storage.local.set({ groupData: groupsData });
}

export async function addCVinGroup(group, selectedAuthors) {
  const groupsData = await getGroups();
  const groupData = groupsData[group];
  groupData.authors = groupData.authors.concat(selectedAuthors);

  await chrome.storage.local.set({ groupData: groupsData });
}

export async function removeCVfromGroup(group, author) {
  const groupsData = await getGroups();
  const groupData = groupsData[group];

  groupData.authors = groupData.authors.filter(
    (currAuthor) => currAuthor !== author
  );

  await chrome.storage.local.set({ groupData: groupsData });
}

// delete CV data from lattes data and save it back to local storage area
export async function removerCVfromDB(author) {
  const lattesData = await getLattesData();
  const groupsData = await getGroups();

  // check if there is an
  if (Object.keys(lattesData).length === 0) {
    alert('Não achamos nenhum CV salvo.');
    return;
  }

  // delete author data from Lattes data
  delete lattesData[author];

  // remove author from all groups
  Object.keys(groupsData).forEach(async (group) => {
    await removeCVfromGroup(group, author);
  });

  // save Lattes data back to storage area
  await chrome.storage.local.set({ lattes_data: lattesData }).then(() => {
    console.log('Lattes data removed!');
  });
}

/**
 * Exports
 */
export async function exportGroupCV(authors, areaData) {
  const lattesData = await getLattesData();

  const authorsData = Object.keys(lattesData)
    .map((authorLink) =>
      authors.includes(authorLink)
        ? { link: authorLink, ...lattesData[authorLink] }
        : null
    )
    .filter((author) => author !== null);

  let authorsName = [];
  let removedAuthors = [];
  authorsData.forEach((authorData) => {
    const pubInfo = authorData.pubInfo;
    if (
      (Array.isArray(pubInfo) && pubInfo.length > 0) ||
      (typeof pubInfo === 'object' && Object.entries(pubInfo).length > 0)
    ) {
      // get area label

      authorsName.push(authorData.name);
    } else {
      removedAuthors.push(authorData.name);
    }
  });

  const areaString =
    Object.keys(areaData).length !== 0
      ? ` utilizando a pontuação da ${areaData.label}`
      : '';

  const authorsNameString = authorsName.map((authorName, index) =>
    index === 0
      ? authorName
      : index === authorsName.length - 1
      ? ' e ' + authorName
      : ', ' + authorName
  );
  const removedAuthorsString = removedAuthors.map((authorName, index) =>
    index === 0
      ? authorName
      : index === authorsName.length - 1
      ? ' e ' + authorName
      : ', ' + authorName
  );

  if (removedAuthors.length !== 0)
    alert(
      'Estes CV não possuem dados de publicações em periódico: ' +
        removedAuthorsString
    );

  if (authorsName !== 0) {
    var result = window.confirm(
      `Confirma a exportação dos dados do CV de ${authorsNameString} para o formato CSV${areaString}?`
    );
    if (result) {
      // export CV data to external file
      exportCVDataToFile(authorsData, areaData);
    }
  }
}

export async function exportCV(authorLink, areaData) {
  const authorData = await getAuthorData(authorLink);
  const pubInfo = authorData.pubInfo;

  if (
    (Array.isArray(pubInfo) && pubInfo.length > 0) ||
    (typeof pubInfo === 'object' && Object.entries(pubInfo).length > 0)
  ) {
    // get area label
    const areaString =
      Object.keys(areaData).length !== 0
        ? ` utilizando a pontuação da ${areaData.label}`
        : '';

    var result = window.confirm(
      `Confirma a exportação dos dados do CV de ${authorData.name} para o formato CSV${areaString}?`
    );
    if (result) {
      // export CV data to external file
      exportCVDataToFile([authorData], areaData);
    }
  } else {
    alert('Este CV não possui dados de publicações em periódico.');
  }
}

function exportCVDataToFile(authorsData, areaData) {
  // export author data in CSV format
  chrome.downloads.download({
    url:
      'data:text/csv;charset=utf-8,' +
      encodeURIComponent(convertLattesDataToCSV(authorsData, areaData)),
    filename: `CVs.csv`,
  });
}

function convertLattesDataToCSV(authorsData, areaData) {
  const headers = [
    'nome',
    'lattes_url',
    'ano_publicacao',
    'titulo_publicacao',
    'periodico',
    'issn',
    'qualis',
    'pontos',
    'area',
    'ano_base',
  ];
  // get area label and scores (if available)
  var areaLabel = '';
  var areaScores;
  if (Object.keys(areaData).length !== 0) {
    areaLabel = areaData.label;
    areaScores = areaData.scores;
  }

  const rows = [];
  authorsData.forEach((authorData) => {
    for (const pubInfoYear of Object.keys(authorData.pubInfo)) {
      for (const pubListElem of authorData.pubInfo[pubInfoYear]) {
        const row = [
          `"${authorData.name}"`,
          authorData.link,
          pubInfoYear,
          `"${pubListElem.title}"`,
          `"${pubListElem.pubName}"`,
          pubListElem.issn,
          pubListElem.qualis,
          pubListElem.qualis !== 'N' && areaLabel !== ''
            ? getQualisScore(pubListElem.qualis, 1, areaScores)
            : '',
          pubListElem.qualis !== 'N' ? areaLabel : '',
          pubListElem.baseYear,
        ];
        rows.push(row);
      }
    }
  });

  const csvArray = [headers.join(','), ...rows.map((row) => row.join(','))];
  return csvArray.join('\n');
}

/**
 * Data functions
 */

export function addMissingYearsToAuthorStats(stats, pubInfo, startYear) {
  const newStats = {};
  // reset new stats count lists
  for (const key of Object.keys(stats)) {
    newStats[key] = [];
  }

  const newPubInfo = {};
  const lastYear = new Date().getFullYear();
  const firstYear = startYear || Object.keys(pubInfo)[0];
  for (let year = lastYear; year >= firstYear; year--) {
    // add empty counts to missing year stats
    if (Object.keys(pubInfo).includes(year.toString())) {
      newPubInfo[year] = pubInfo[year];
    } else {
      newPubInfo[year] = [];
    }
  }

  let currYear = new Date().getFullYear() + 1;
  for (const pubInfoYear of Object.keys(pubInfo).reverse()) {
    // add empty results for missing years (if any)
    for (let year = currYear - 1; year > pubInfoYear; year--) {
      // add empty counts to missing year stats
      for (const key of Object.keys(newStats)) {
        if (key === 'year') {
          newStats[key].push(year);
        } else {
          newStats[key].push(0);
        }
      }
    }

    // copy current year counts to new stats
    for (const key of Object.keys(newStats)) {
      newStats[key].push(stats[key][pubInfoYear]);
    }

    // update current year
    currYear = pubInfoYear;
  }

  return {
    stats: stats,
    minYear: NaN,
    maxYear: NaN,
    totalPubs: NaN,
    pubInfo: newPubInfo,
  };
}

export function addMissingYearsToPubInfo(pubInfo, startYear) {
  const newPubInfo = {};
  const lastYear = new Date().getFullYear();
  const firstYear = startYear || Object.keys(pubInfo)[0];
  for (let year = lastYear; year >= firstYear; year--) {
    // add empty counts to missing year stats
    if (Object.keys(pubInfo).includes(year.toString())) {
      newPubInfo[year] = pubInfo[year];
    } else {
      newPubInfo[year] = [];
    }
  }

  return newPubInfo;
}

export function getQualisStats(pubInfo, metric = 'qualis', scores = {}) {
  const qualisCats = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'C', 'N'];
  const qualisCols = ['year'].concat(qualisCats);

  // reset Qualis stats
  const qualisStats = {};
  for (const col of qualisCols) {
    qualisStats[col] = []; // Inicializa cada chave como array
  }

  // reset year counts
  const yearCounts = {};
  for (const cat of qualisCats) {
    yearCounts[cat] = 0;
  }

  let currYear = 0;

  for (const pubInfoElem of Object.keys(pubInfo)) {
    if (currYear !== pubInfoElem) {
      if (currYear > 0) {
        // add current year counts to Qualis results
        for (const key of Object.keys(yearCounts)) {
          // Verifica se qualisStats[key] existe, se não, inicializa
          if (!qualisStats[key]) {
            qualisStats[key] = [];
          }
          qualisStats[key].push(yearCounts[key]); // Agora garantido como array
        }

        // reset year counts
        for (const key of Object.keys(yearCounts)) {
          yearCounts[key] = 0;
        }
      }

      // update current year
      currYear = pubInfoElem;

      // add current year to Qualis counts
      if (!qualisStats['year']) {
        qualisStats['year'] = [];
      }
      qualisStats['year'].push(currYear);
    }

    // increment year counts for each publication based on given metric
    for (const pubItem of pubInfo[pubInfoElem]) {
      if (metric === 'qualis') {
        yearCounts[pubItem.qualis] += 1;
      } else if (metric === 'score' && Object.keys(scores).length > 0) {
        yearCounts[pubItem.qualis] += parseFloat(
          getQualisScore(pubItem.qualis, 1, scores)
        );
      } else if (metric === 'jcr') {
        yearCounts[pubItem.qualis] += parseFloat(pubItem.jcr);
      }
    }
  }

  if (qualisStats['year'].length > qualisStats['A1'].length) {
    // add year counts to Qualis stats
    for (const key of Object.keys(yearCounts)) {
      if (!qualisStats[key]) {
        qualisStats[key] = [];
      }
      qualisStats[key].push(yearCounts[key]);
    }
  }

  return qualisStats;
}

// get Qualis score for given category
export function getQualisScore(qualisCategory, count, areaScores) {
  return areaScores[qualisCategory] * count;
}

/**
 * Graph functions
 */

export function getBoundedTrendPoint(regression, x, xList, yBound) {
  let newX = parseFloat(x);
  let newXIndex = xList.indexOf(Math.round(newX));
  let y = regression.calcY(newX);

  if (isNaN(y)) return { x: 0, y: 0 };

  if (y < yBound.min) {
    newX = (yBound.min - regression.yStart) / regression.slope;
    newXIndex = xList.indexOf(Math.round(newX));
    return { x: newXIndex, y: yBound.min };
  } else if (y > yBound.max) {
    newX = (yBound.max - regression.yStart) / regression.slope;
    newXIndex = xList.indexOf(Math.round(newX));
    return { x: newXIndex, y: yBound.max };
  }

  return { x: newXIndex, y: y };
}

function getTotalPerPerson(dataCounts) {
  return Object.values(dataCounts).map(personData => {
    const totalA = personData.A?.allyears || 0;
    const totalB = personData.B?.allyears || 0;
    return totalA + totalB;
  });
}


export function getStatisticsAnnotations(
  totalStats,
  showStatistics,
  end,
  init,
  isUnifiedChart,
  dataCounts
) {
  console.log("getStatisticsAnnotations chamado com:", totalStats);
  console.log(dataCounts)
  console.log(isUnifiedChart)

  const lineAnnotations = [];

  if (showStatistics && end - init >= 0) {
    totalStats.tot.yearList = totalStats.tot.yearList.map((year) =>
      Number(year)
    );

    let mean;
    // Média
    if(isUnifiedChart && Object.keys(totalStats).length > 1){
      mean = arrayMean(getTotalPerPerson(dataCounts)).toFixed(2);
    }
    else{
      mean = arrayMean(totalStats.tot.countList).toFixed(2);
    }
    lineAnnotations.push({
      id: 'mean',
      type: 'line',
      mode: 'horizontal',
      borderColor: '#2c4c8c',
      value: mean,
      scaleID: 'y',
      borderWidth: 1,
      borderDash: [6, 6],
      label: {
        content: 'Média ' + mean,
        position: 'start',
        padding: 4,
        backgroundColor: 'rgba(44, 76, 140, 0.7)',
        font: { size: 11 },
        z: 10,
        display: true,
      },
    });
    
    let median;
    // Mediana
    if(isUnifiedChart && Object.keys(totalStats).length > 1){
      median = arrayMedian(getTotalPerPerson(dataCounts)).toFixed(2);
    }
    else{
      median = arrayMedian(totalStats.tot.countList).toFixed(2);
    }
    
    lineAnnotations.push({
      id: 'median',
      type: 'line',
      mode: 'horizontal',
      borderColor: '#2c4c8c',
      value: median,
      scaleID: 'y',
      borderWidth: 1,
      borderDash: [4, 4],
      label: {
        content: 'Mediana ' + median,
        position: '50%',
        padding: 4,
        backgroundColor: 'rgba(44, 76, 140, 0.7)',
        font: { size: 11 },
        z: 10,
        display: true,
      },
    });

    // Tendência (somente se não for unificado e houver mais de um ano)
    if (!isUnifiedChart && init !== end) {
      const maxCount = arrayMax(totalStats.tot.countList);
      const regression = linearRegression(
        totalStats.tot.yearList,
        totalStats.tot.countList
      );

      const minPoint = getBoundedTrendPoint(
        regression,
        init,
        totalStats.tot.yearList.slice(),
        { min: 0, max: maxCount }
      );

      const maxPoint = getBoundedTrendPoint(
        regression,
        end,
        totalStats.tot.yearList.slice(),
        { min: 0, max: maxCount }
      );

      lineAnnotations.push({
        id: 'trend',
        type: 'line',
        borderColor: '#2c4c8c',
        xMin: minPoint.x,
        xMax: maxPoint.x,
        xScaleID: 'x',
        yMin: minPoint.y.toFixed(2),
        yMax: maxPoint.y.toFixed(2),
        yScaleID: 'y',
        borderWidth: 1,
        borderDash: [2, 2],
        label: {
          content: 'Tendência ' + regression.slope.toFixed(2),
          position: 'end',
          padding: 4,
          backgroundColor: 'rgba(44, 76, 140, 0.7)',
          font: { size: 11 },
          z: 10,
          display: true,
        },
      });
    }
  }

  return lineAnnotations;
}


export function getBarChatInfo(
  dataCounts,
  years,
  totalStats,
  showStatistics,
  end,
  init,
  xTitle,
  yTitle,
  areaData,
  isUnifiedChart = false
) {
  // Show the data in a stacked bar chart
  const baseColorPalette = [
    'rgb(54, 162, 235)', // blue
    'rgb(255, 99, 132)', // red
    'rgb(75, 192, 192)', // green
    'rgb(255, 205, 86)', // yellow
    'rgb(153, 102, 255)', // purple
    'rgb(255, 159, 64)', // orange
    'rgb(201, 203, 207)', // gray
    // 'rgba(245, 245, 245, 1)', // light gray
    // 'rgba(77, 201, 246, 1)', // light blue
    // 'rgba(246, 112, 25, 1)', // orange
    // 'rgba(245, 55, 148, 1)', // pink
    // 'rgba(83, 123, 196, 1)', // medium blue
    // 'rgba(172, 194, 54, 1)', // greenish
    // 'rgba(22, 106, 143, 1)', // teal
    // 'rgba(0, 169, 80, 1)', // green
    // 'rgba(88, 89, 91, 1)', // dark gray
    // 'rgba(133, 73, 186, 1)', // purple
  ];

  const fillPatterns = [
    'none',
    'diagonal',
    'dot',
    'weave',
    'zigzag',
    'cross',
    'diamond',
    'line',
  ];

  // Define lighten color maps:
  // If only A, B:
  const labelLightenMapScores = {
    A: 0.0,
    B: 0.3,
  };

  // If A, B, C, N:
  const labelLightenMapNoScores = {
    A: 0.0,
    B: 0.3,
    C: 0.55,
    N: 0.8,
  };

  console.log('dataCounts:', dataCounts);

  if (isUnifiedChart) {
    const sortedKeys = Object.keys(dataCounts)
      .map((name) => {
        const totalSum = Object.values(dataCounts[name])
          .flatMap(obj => Object.values(obj))
          .reduce((acc, val) => acc + val, 0);
        return { name, totalSum };
      })
      .sort((a, b) => a.totalSum - b.totalSum)
      .map((item) => item.name);
  
    // Recria os dataCounts ordenados
    const sortedDataCounts = {};
    sortedKeys.forEach((key) => {
      sortedDataCounts[key] = dataCounts[key];
    });
  
    dataCounts = sortedDataCounts;
  }
  

  let datasets = [];
  const dataKeys = Object.keys(dataCounts);

  dataKeys.forEach((name, index) => {
    // Choose the base color and fill pattern for this stack
    const baseColor = baseColorPalette[index % baseColorPalette.length];

    const fillPattern =
      fillPatterns[
        Math.floor(index / baseColorPalette.length) % fillPatterns.length
      ];

    const stackName = name === '__all' ? 'Todos os currículos' : name;

    // Decide which alpha map to use (depends on 'scores' or not)
    const labelLightenMap =
      areaData && areaData.scores
        ? labelLightenMapScores
        : labelLightenMapNoScores;

    // If 'scores' is true, we have A & B; otherwise A, B, C, N
    const labelsForThisStack = Object.keys(labelLightenMap);

    const filteredLabels = labelsForThisStack.filter((label) => {
      return Object.keys(dataCounts[name]).includes(label);
    });

    filteredLabels.forEach((label) => {
      const lightenLevel = labelLightenMap[label];

      // Overwrite the alpha channel of the base color
      const lightenedColor = lightenColorRGB(baseColor, lightenLevel);

      // Define the color for this label with possible fill pattern
      let labelColor;
      if (fillPattern === 'none') {
        labelColor = lightenedColor;
      } else {
        labelColor = pattern.draw(fillPattern, lightenedColor, '#fff');
      }

      datasets.push({
        label: label,
        data: Object.values(dataCounts[name][label]),
        backgroundColor: labelColor,
        stack: stackName,
        barThickness: 'flex',
        // maxBarThickness: 15,
        categoryPercentage: 0.75, // space taken by each bar group out of the category width
        barPercentage: 1.0, // space taken by each bar within its group
        // clip: false, // prevents bars from being clipped at the chart border
      });
    });
  });

  console.log('final datasets:', datasets);

  let legendItems = [];
  dataKeys.forEach((name, index) => {
    // Choose the base color and fill pattern for this legend item
    const baseColor = baseColorPalette[index % baseColorPalette.length];

    const fillPattern =
      fillPatterns[
        Math.floor(index / baseColorPalette.length) % fillPatterns.length
      ];

    // Define the color for this legend with possible fill pattern
    let legendColor;
    if (fillPattern === 'none') {
      legendColor = baseColor;
    } else {
      legendColor = pattern.draw(fillPattern, baseColor, '#fff');
    }

    if (name !== '__all') {
      legendItems.push({
        text: abbreviatePortugueseName(name),
        fillStyle: legendColor,
        strokeStyle: 'transparent', // no visible border
        lineWidth: 0, // remove outline
        hidden: false,
      });
    }
  });

  const lineAnnotations = getStatisticsAnnotations(
    totalStats,
    showStatistics,
    end,
    init,
    isUnifiedChart,
    dataCounts
  );
  

  const options = {
    plugins: {
      annotation: {
        annotations: lineAnnotations,
      },
      legend: {
        // position: 'top',
        position: 'bottom',
        labels: {
          generateLabels: function () {
            return legendItems;
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem) {
            return `${tooltipItem.dataset.label}: ${tooltipItem.raw}`;
          },
          title: function (tooltipItems) {
            return `${tooltipItems[0].dataset.stack}`;
          },
        },
      },
    },
    responsive: true,
    // maintainAspectRatio: false,
    interaction: {
      mode: 'x',
      intersect: false,
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        },
        offset: true,
        title: {
          display: true,
          text: xTitle,
        },
      },
      y: {
        stacked: true,
        grid: {
          display: false,
        },
        type: 'linear',
        ticks: {
          precision: 0,
          // stepSize: 1,
          // callback: function (value) {
          //   return Math.round(value);
          // },
        },
        title: {
          display: true,
          text: yTitle,
        },
      },
    },
    // elements: {
    //   bar: {
    //     borderWidth: 0,
    // },
    borderWidth: 1,
    maxBarThickness: 50,
  };

  const data = {
    labels: isUnifiedChart
      ? [`${init} - ${end}`]
      : years
          .filter((year) => year >= init && year <= end)
          .map((year) => year.toString()),
    datasets,
  };

  return { options, data };
}

export function getParetoChartInfo(dataCounts, xTitle, yTitle) {
  // Prepare data counts for a pareto chart
  const dataArray = [];

  // Transform unified data counts into an array of the format [{name: 'john', value: 5}, ...]
  const dataKeys = Object.keys(dataCounts);

  dataKeys.forEach((name) => {
    let dataCounter = 0;
    Object.keys(dataCounts[name]).forEach((label) => {
      dataCounter += dataCounts[name][label].allyears;
    });
    dataArray.push({
      name: name,
      value: dataCounter,
    });
  });

  // Sort data array descending by value
  dataArray.sort((a, b) => b.value - a.value);

  console.log('dataArray:', dataArray);

  // Compute the total sum of all values
  const total = dataArray.reduce((acc, item) => acc + item.value, 0);

  console.log('total sum:', total);

  // Build dataset for the chart
  const labels = [];
  const cumulativePercents = [];

  let runningSum = 0;
  dataArray.forEach((item, index) => {
    labels.push(abbreviatePortugueseName(item.name));
    // labels.push(`Autor ${index + 1}`);
    runningSum += item.value;
    const percent = (runningSum / total) * 100;
    // Round if desired (e.g., one decimal place)
    cumulativePercents.push(parseFloat(percent.toFixed(1)));
  });

  console.log('labels:', labels, 'cumulativePercents:', cumulativePercents);

  // Determine the 25th / 50th percentile positions
  const n = dataArray.length;
  const p25Index = Math.floor(n * 0.25) > 0 ? Math.floor(n * 0.25) - 1 : 0;
  const p50Index = Math.floor(n * 0.5) > 0 ? Math.floor(n * 0.5) - 1 : 0;

  // Get the cumulative % values just BEFORE those lines
  const p25YValue = cumulativePercents[p25Index];
  const p50YValue = cumulativePercents[p50Index];

  // Define chart config options
  const options = {
    plugins: {
      annotation: {
        annotations: {
          percentile25: {
            type: 'line',
            xMin: p25Index, // same as xMax if you want a single vertical line
            xMax: p25Index,
            borderColor: 'darkgray',
            borderWidth: 2,
            borderDash: [6, 6], // dashed line
            clip: false,
            label: {
              display: true,
              content: `P25 (${p25YValue.toFixed(1)}% da produção)`,
              position: 'end',
              yAdjust: -10,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              color: 'darkgray',
            },
          },
          percentile50: {
            type: 'line',
            xMin: p50Index,
            xMax: p50Index,
            borderColor: 'darkgray',
            borderWidth: 2,
            borderDash: [6, 6],
            clip: false,
            label: {
              display: true,
              content: `P50 (${p50YValue.toFixed(1)}% da produção)`,
              position: 'end',
              yAdjust: -10,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              color: 'darkgray',
            },
          },
        },
      },
      legend: {
        display: false,
      },
    },
    type: 'line',
    responsive: true,
    scales: {
      x: {
        title: {
          display: true,
          text: xTitle,
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: yTitle,
        },
      },
    },
  };

  // Define chart data
  const data = {
    labels: labels,
    datasets: [
      {
        // label: 'Percentual acumulado',
        label: '',
        data: cumulativePercents, //
        backgroundColor: 'rgb(75, 192, 192)',
      },
    ],
  };

  return { options, data };
}

// Helper function to Update the alpha channel of an RGBA color string
// function setColorAlpha(rgbaStr, newAlpha) {
//   // Regex to capture the R, G, B, and A parts:
//   const match = rgbaStr.match(
//     /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,?\s*(\d*\.?\d*)?\)/i
//   );
//   if (!match) {
//     // If it doesn't match, just return the original or throw an error
//     return rgbaStr;
//   }

//   // Extract existing R, G, B (we're ignoring the original alpha, if any)
//   const r = match[1];
//   const g = match[2];
//   const b = match[3];

//   // newAlpha should be a float between 0 and 1
//   return `rgba(${r}, ${g}, ${b}, ${newAlpha})`;
// }

// Helper function to lighten an RGB color string:
function lightenColorRGB(rgbStr, lightenFactor) {
  const match = rgbStr.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (!match) return rgbStr; // fallback

  let r = parseInt(match[1], 10);
  let g = parseInt(match[2], 10);
  let b = parseInt(match[3], 10);

  r = Math.round(r + (255 - r) * lightenFactor);
  g = Math.round(g + (255 - g) * lightenFactor);
  b = Math.round(b + (255 - b) * lightenFactor);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Data stats util functions
 */

// update total data stats
export function updateTotalStats(totalStats, yearCounts, year) {
  for (const key of Object.keys(yearCounts)) {
    // update total stats lists
    totalStats[key].countList.push(yearCounts[key]);
    totalStats[key].yearList.push(year);

    // update total stats best
    if (yearCounts[key] > totalStats[key].best.count) {
      totalStats[key].best.count = yearCounts[key];
      totalStats[key].best.year = year;
    }
  }
  return totalStats;
}

// unify stats years
export function unifyStatsYears(inputStats) {
  const outputStats = {};

  // For each 'name' in the input
  for (const nameKey in inputStats) {
    // The original object for this 'name'
    const originalObj = inputStats[nameKey];

    // We'll build a new object with the same structure but unified years
    const newObj = {};

    for (const catKey in originalObj) {
      if (catKey === 'year') {
        // Replace the array of years with a single entry
        newObj[catKey] = ['allyears'];
      } else {
        // Sum up all values in the array
        const sum = originalObj[catKey].reduce((acc, val) => acc + val, 0);
        // Store that single sum in an array
        newObj[catKey] = [sum];
      }
    }

    outputStats[nameKey] = newObj;
  }

  return outputStats;
}

// unify stats years
export function unifyDataCounts(inputDataCounts) {
  const outputDataCounts = {};

  // For each 'name' in the input
  for (const nameKey in inputDataCounts) {
    // The original object for this 'name'
    const originalObj = inputDataCounts[nameKey];

    // We'll build a new object with the same structure but unified years
    const newObj = {};

    for (const catKey in originalObj) {
      newObj[catKey] = {};
      // Sum up all year values fro category
      newObj[catKey]['allyears'] = 0;
      for (const year in originalObj[catKey]) {
        newObj[catKey]['allyears'] += originalObj[catKey][year];
      }
    }

    outputDataCounts[nameKey] = newObj;
  }

  return outputDataCounts;
}

// unify stats years
export function filterDataCounts(inputDataCounts, catFilters) {
  const outputDataCounts = {};

  // For each 'name' in the input
  for (const nameKey in inputDataCounts) {
    // The original object for this 'name'
    const originalObj = inputDataCounts[nameKey];

    // We'll build a new object with the same structure but with filtered categories
    const newObj = {};

    for (const catKey in originalObj) {
      if (catFilters.includes(catKey)) {
        newObj[catKey] = originalObj[catKey];
      }
    }

    outputDataCounts[nameKey] = newObj;
  }

  return outputDataCounts;
}

function abbreviatePortugueseName(fullName) {
  if (fullName === 'Todos os currículos' || fullName === "Todos os currículos") {
    return fullName;
  }
  // Common bridging words in Portuguese
  const BRIDGING_WORDS = new Set(['de', 'do', 'da', 'das', 'dos', 'e']);

  // Suffix surnames that should remain attached to the main family name
  // (case-insensitive match)
  const SUFFIX_SURNAMES = new Set([
    'filho',
    'filha',
    'neto',
    'neta',
    'bisneto',
    'bisneta',
    'sobrinho',
    'sobrinha',
    'júnior',
    'junior',
    'jr',
  ]);

  // 1. Split the name into parts
  let parts = fullName.trim().split(/\s+/).filter(Boolean);

  // If there's only one name, just return it as is
  if (parts.length <= 1) {
    return parts.join(' ');
  }

  // 2. Identify if there are suffix surnames at the end
  //    We gather all consecutive suffixes from the right.
  const suffixParts = [];
  while (
    parts.length > 1 && // need at least 2 parts to have a "main surname + suffix"
    SUFFIX_SURNAMES.has(parts[parts.length - 1].toLowerCase())
  ) {
    suffixParts.unshift(parts.pop());
  }

  // 3. Now the last token left is the main surname
  const mainLastName = parts.pop();
  const finalLastName = [mainLastName, ...suffixParts].join(' ');

  // 4. Everything else (the "middle" portion + first name) are in 'parts'
  //    Filter out bridging words and abbreviate them.
  //    The first name is also turned into an initial.
  //    (If you want to keep the first name intact, just skip it in the loop.)
  const abbreviated = parts
    .map((word) => word.toLowerCase())
    .filter((word) => !BRIDGING_WORDS.has(word)) // remove bridging words
    .map((word) => (word[0] || '').toUpperCase() + '.'); // convert to initial with "."

  // 5. Join the abbreviated parts + final last name
  //    e.g. ["J.", "M."] + "Mendonça Filho" => "J. M. Mendonça Filho"
  return [...abbreviated, finalLastName].join(' ');
}

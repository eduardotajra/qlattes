function updateQualisGraphicView(stats, startYear, endYear) {
  const dataCounts = {
    A: {
      background: '#415e98', // 10% white over #2c4c8c - see https://colorkit.co/color-shades-generator/2c4c8c/
      border: 'white',
    },
    B: {
      background: '#8094ba', // 40% white over #2c4c8c
      border: 'white',
    },
    C: {
      background: '#c0c9dd', // 70% white over #2c4c8c
      border: 'white',
    },
    N: {
      background: '#eaedf4', // 90% white over #2c4c8c
      border: 'white',
    },
    tot: {},
  };

  const chartOptions = {
    legend: {
      display: true,
      label: 'Estrato Qualis',
      labels: {
        padding: 20,
      },
    },
    yStepSize: 1,
  };

  updateGraphicView(
    stats,
    dataCounts,
    chartOptions,
    startYear,
    endYear,
    // updateYearCounts function
    (yearCounts, stats, key, currYear) => {
      // get key's first character
      const keyChar = key.slice(0, 1);
      // increment year counts based on key's first character
      const countVal = stats[key][currYear];
      yearCounts[keyChar] += countVal;
      yearCounts.tot += countVal;
      // return updated year counts
      return yearCounts;
    }
  );
}

function updateScoreGraphicView(stats, startYear, endYear) {
  const dataCounts = {
    Pontos: {
      background: '#415e98', // 10% white over #2c4c8c - see https://colorkit.co/color-shades-generator/2c4c8c/
      border: 'white',
    },
    tot: {},
  };

  const chartOptions = {
    legend: {
      display: true,
      label: 'Pontuação Qualis',
      labels: {
        padding: 20,
        generateLabels: function (chart) {
          const originalLabels =
            Chart.defaults.plugins.legend.labels.generateLabels(chart);
          // Modify the label text
          for (var i = 0; i < originalLabels.length; i++) {
            originalLabels[i].text = 'Pontos acumulados';
          }
          return originalLabels;
        },
      },
    },
    yStepSize: 10,
  };

  updateGraphicView(
    stats,
    dataCounts,
    chartOptions,
    startYear,
    endYear,
    // updateYearCounts function
    (yearCounts, stats, key, currYear) => {
      // increment year counts based on key's Qualis score
      const countVal = getQualisScore(key, stats[key][currYear]);
      yearCounts.Pontos += countVal;
      yearCounts.tot += countVal;
      // return updated year counts
      return yearCounts;
    }
  );
}

function updateGraphicView(
  stats,
  dataCounts,
  chartOptions,
  startYear,
  endYear,
  updateYearCounts
) {
  // reset total stats
  let totalStats = {};
  for (const key of Object.keys(dataCounts)) {
    totalStats[key] = {
      best: { count: 0, year: 0 },
      countList: [],
      yearList: [],
    };
  }

  // get stats input state (if available)
  const statsState = getStatsInputState('stats');
  // console.log(statsState);

  // delete current view if it already exists
  removeElements("[tag='view']");

  // create stats check box
  const form = document.querySelector('#form-filters');
  createStatsCheckboxes(form, [
    { id: 'stats-input', label: 'Exibir estatísticas' },
  ]);

  // calculate author stats for the selected period
  for (let currYear = 0; currYear < stats.year.length; currYear++) {
    if (stats.year[currYear] >= startYear && stats.year[currYear] <= endYear) {
      // reset year counts
      let yearCounts = {};
      for (const count of Object.keys(dataCounts)) {
        yearCounts[count] = 0;
      }

      // accumulate year counts
      for (const key of Object.keys(stats)) {
        if (key == 'year') {
          continue;
        }
        // increment year counts
        yearCounts = updateYearCounts(yearCounts, stats, key, currYear);
      }

      // update total stats
      console.log('yearCounts: ', yearCounts);
      totalStats = updateTotalStats(
        totalStats,
        yearCounts,
        stats.year[currYear]
      );
      console.log('totalStats: ', totalStats);
    }
  }

  // get view div element
  const div = document.querySelector('#view-div');

  // create canvas element
  const canvas = document.createElement('canvas');
  canvas.setAttribute('tag', 'view');

  // add canvas to view div
  div.append(canvas);

  const lineAnnotations = {};

  if (endYear - startYear > 0) {
    // create mean line annotation
    const mean = totalStats.tot.countList.mean().toFixed(2);
    // console.log(`mean: ${mean}; countList: ${totalStats.tot.countList}`);
    const meanLine = createAnnotationLine(
      {
        xMin: totalStats.tot.yearList.indexOf(parseInt(startYear)),
        xMax: totalStats.tot.yearList.indexOf(parseInt(endYear)),
        xScaleID: 'x',
        yMin: mean,
        yMax: mean,
        yScaleID: 'y',
        label: {
          content: 'Média ' + mean.replace('.', ','),
          position: 'end',
          padding: 4,
          backgroundColor: 'rgba(44, 76, 140, 0.7)', // 'rgba(0, 0, 0, 0.7)',
          font: {
            size: 11,
          },
          z: 10,
          display: true,
        },
      },
      '#2c4c8c', //'rgba(0, 0, 0, 0.8)',
      1,
      [6, 6],
      'mean-input'
    );
    // console.log(meanLine);
    lineAnnotations.meanLine = meanLine;

    // create median line annotation
    const median = totalStats.tot.countList.median().toFixed(2);
    const medianLine = createAnnotationLine(
      {
        xMin: totalStats.tot.yearList.indexOf(parseInt(startYear)),
        xMax: totalStats.tot.yearList.indexOf(parseInt(endYear)),
        xScaleID: 'x',
        yMin: median,
        yMax: median,
        yScaleID: 'y',
        label: {
          content: 'Mediana ' + median.replace('.', ','),
          position: '50%',
          // xAdjust: 50,
          padding: 4,
          backgroundColor: 'rgba(44, 76, 140, 0.7)', // 'rgba(0, 0, 0, 0.7)',
          font: {
            size: 11,
          },
          z: 10,
          display: true,
        },
      },
      '#2c4c8c', //'rgba(0, 0, 0, 0.8)',
      1,
      [4, 4],
      'median-input'
    );
    // console.log(medianLine);
    lineAnnotations.medianLine = medianLine;

    // get max counts in totalStats
    const maxCount = getMaxCount(totalStats);

    // create trend line annotation
    const regression = linearRegression(
      totalStats.tot.yearList,
      totalStats.tot.countList
    );
    const minPoint = getBoundedTrendPoint(
      regression,
      startYear,
      totalStats.tot.yearList.slice().reverse(),
      {
        min: 0,
        max: maxCount,
      }
    );
    const maxPoint = getBoundedTrendPoint(
      regression,
      endYear,
      totalStats.tot.yearList.slice().reverse(),
      {
        min: 0,
        max: maxCount,
      }
    );
    // console.log(regression, minPoint, maxPoint);

    const trendLine = createAnnotationLine(
      {
        xMin: minPoint.x,
        xMax: maxPoint.x,
        xScaleID: 'x',
        yMin: minPoint.y.toFixed(2),
        yMax: maxPoint.y.toFixed(2),
        yScaleID: 'y',
        label: {
          content: 'Tendência ' + regression.slope.toFixed(2).replace('.', ','),
          position: 'end',
          padding: 4,
          backgroundColor: 'rgba(44, 76, 140, 0.7)', // 'rgba(0, 0, 0, 0.7)',
          font: {
            size: 11,
          },
          z: 10,
          display: true,
        },
      },
      '#2c4c8c', //'rgba(0, 0, 0, 0.8)',
      1,
      [2, 2],
      'trend-input'
    );
    // console.log(trendLine);
    lineAnnotations.trendLine = trendLine;
  }
  console.log('line annotations', lineAnnotations);

  // create chart
  const chart = createChart(
    canvas,
    dataCounts,
    chartOptions,
    totalStats,
    startYear,
    endYear,
    lineAnnotations
  );

  // create stats checkbox input listener
  const statsInput = document.querySelector('#stats-input');
  statsInput.addEventListener('change', function () {
    // console.log(lineAnnotations);

    if (lineAnnotations) {
      for (const line of Object.keys(lineAnnotations)) {
        lineAnnotations[line].display = this.checked;
      }

      chart.options.plugins.annotation = {
        annotations: lineAnnotations,
      };
      chart.update('none');
    }
  });

  // set stats input state
  if (statsState) {
    const statsInput = document.querySelector('#stats-input');
    statsInput.checked = statsState;
    statsInput.dispatchEvent(new Event('change'));
  }
}

function getStatsInputState(tag) {
  // attempt to get stat input element
  const statsInput = document.querySelector('#' + tag + '-input');

  return statsInput ? statsInput.checked : false;
}

function createStatsCheckboxes(parentElem, boxes) {
  for (const box of boxes) {
    // create box input element
    const boxInput = document.createElement('input');
    setAttributes(boxInput, {
      type: 'checkbox',
      id: box.id,
      tag: 'view',
    });

    // add box input immediately after sibling element
    parentElem.insertAdjacentElement('beforeend', boxInput);

    // create box label
    const boxLabel = document.createElement('label');
    setAttributes(boxLabel, {
      for: box.id,
      id: box.id + '-label',
      tag: 'view',
    });
    boxLabel.textContent = box.label;

    // add box label immediately after box input
    insertAfter(boxInput, boxLabel);
  }
}

function createAnnotationLine(
  annotationAttributes,
  color,
  borderWidth = 1,
  borderDash = []
) {
  const annotationLine = {
    type: 'line',
    borderColor: color,
    borderWidth: borderWidth,
    borderDash: borderDash,
    drawTime: 'afterDatasetsDraw',
    display: false,
  };

  // add annotation attributes
  for (const key of Object.keys(annotationAttributes)) {
    annotationLine[key] = annotationAttributes[key];
  }

  return annotationLine;
}

function getBoundedTrendPoint(regression, x, xList, yBound) {
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

function createChart(
  canvas,
  dataCounts,
  chartOptions,
  totalStats,
  startYear,
  endYear,
  lineAnnotations
) {
  Chart.defaults.backgroundColor = '#9BD0F5';
  Chart.defaults.borderColor = '#000';
  Chart.defaults.color = '#000';

  // create graphic datasets
  const datasets = [];
  for (const key of Object.keys(totalStats)) {
    if (key == 'tot') {
      continue;
    }

    datasets.push({
      label: key,
      data: totalStats[key].countList.slice().reverse(),
      backgroundColor: dataCounts[key].background,
      borderColor: dataCounts[key].border,
    });
  }

  // create graphic
  // eslint-disable-next-line no-undef
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: totalStats[Object.keys(totalStats)[0]].yearList.slice().reverse(),
      datasets: datasets,
    },
    options: {
      plugins: {
        annotation: {
          annotations: lineAnnotations,
        },
        legend: {
          title: {
            display: chartOptions.legend.display,
            text: chartOptions.legend.label,
            font: {
              size: 14,
              // color: 'rgba(0, 0, 0, 1.0)',
              family: 'sans-serif',
              // weight: 'bold',
            },
          },
          labels: chartOptions.legend.labels,
          position: 'top',
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: {
            display: false,
          },
          ticks: {
            stepSize: 1,
            maxRotation: 80,
            font: {
              size: 11,
            },
          },
        },
        y: {
          stacked: true,
          grid: {
            display: false,
          },
          ticks: {
            stepSize: chartOptions.yStepSize,
            font: {
              size: 11,
            },
            // remove separators from Y-axis ticks
            callback: function (value, index, ticks) {
              return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '');
            },
          },
          beginAtZero: true,
        },
      },
      // indexAxis: 'y', // make the chart horizontal
      borderWidth: 1,
      // barThickness: 10,
      minBarThickness: 5,
      maxBarThickness: 12,
      responsive: false,
      // barPercentage: 1.0, //
      // categoryPercentage: 0.5, //
    },
  });

  return chart;
}

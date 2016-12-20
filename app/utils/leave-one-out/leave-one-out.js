import {logger} from '../logger';

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/ivectors`;

const computePercent = res => {
  for (const cluster in res) {
    if (res.hasOwnProperty(cluster)) {
      res[cluster].percentMatch = (Math.floor(
          (res[cluster].numberOfMatches / res[cluster].numberOfSamples) *
          10000) / 100) + ' %';
    }
  }
};

const countMean = scores => {
  let res = {};
  for (const ivTest in scores) {
    if (scores.hasOwnProperty(ivTest)) {
      let className = ivTest.split('-')[0];
      if (!res[className]) {
        res[className] = {
          numberOfMatches: 0,
          numberOfSamples: 0
        };
      }
      let sortable = [];
      for (const cluster in scores[ivTest]) {
        if (scores[ivTest].hasOwnProperty(cluster)) {
          sortable.push([cluster,
            scores[ivTest][cluster].scores.reduce((a, b) => a + b) /
            scores[ivTest][cluster].scores.length]);
        }
      }
      sortable.sort((a, b) => b[1] - a[1]);
      if (className === sortable[0][0]) {
        res[className].numberOfMatches++;
      }
      res[className].numberOfSamples++;
    }
  }
  computePercent(res); // ref object
  return res;
};

const countMeanAVG = scores => {
  let res = {};
  for (const ivTest in scores) {
    if (scores.hasOwnProperty(ivTest)) {
      let className = ivTest.split('-')[0];
      if (!res[className]) {
        res[className] = {
          numberOfMatches: 0,
          numberOfSamples: 0
        };
      }
      let globNum = [];
      for (const cluster in scores[ivTest]) {
        if (scores[ivTest].hasOwnProperty(cluster)) {
          globNum = globNum.concat(scores[ivTest][cluster].scores);
        }
      }
      const mean = globNum.reduce((a, b) => a + b) / globNum.length;
      let sortable = [];
      for (const cluster in scores[ivTest]) {
        if (scores[ivTest].hasOwnProperty(cluster)) {
          let numerator = 0;
          let denominator = 0;
          for (let i = 0; i < scores[ivTest][cluster].scores.length; i++) {
            if (scores[ivTest][cluster].scores[i] - mean > 0) {
              numerator += scores[ivTest][cluster].scores[i] - mean;
              denominator++;
            } else {
              break;
            }
          }
          sortable.push([cluster, numerator / denominator]);
        }
      }
      sortable.sort((a, b) => b[1] - a[1]);
      if (className === sortable[0][0]) {
        res[className].numberOfMatches++;
      }
      res[className].numberOfSamples++;
    }
  }
  computePercent(res);
  return res;
};

const countMeanMatch = scores => {
  let res = {};
  for (let ivTest in scores) {
    if (scores.hasOwnProperty(ivTest)) {
      let className = ivTest.split('-')[0];
      if (!res[className]) {
        res[className] = {
          numberOfMatches: 0,
          numberOfSamples: 0
        };
      }
      let sortable = [];
      for (let cluster in scores[ivTest]) {
        if (scores[ivTest].hasOwnProperty(cluster)) {
          let numerator = 0;
          for (let i = 0; i < scores[ivTest][cluster].numberOfMatches;
               i++) {
            numerator += Math.log(scores[ivTest][cluster].scores[i]);
          }
          sortable.push([cluster,
            numerator / scores[ivTest][cluster].numberOfMatches]);
        }
      }
      sortable.sort((a, b) => b[1] - a[1]);
      if (className === sortable[0][0]) {
        res[className].numberOfMatches++;
      }
      res[className].numberOfSamples++;
    }
  }
  computePercent(res);
  return res;
};

const _retrieveClusters = scores => {
  logger.log('silly', 'retrieveClusters');
  const clusters = [];
  for (const score in scores[0]) {
    if (scores[0].hasOwnProperty(score)) {
      for (const cluster in scores[0][score]) {
        if (scores[0][score].hasOwnProperty(cluster)) {
          clusters.push(cluster);
        }
      }
    }
  }

  return clusters.sort();
};

const _createResMatrix = clusters => {
  const res = {};
  for (const i of clusters) {
    res[i] = {samples: 0, matrix: {}};
    for (const j of clusters) {
      res[i].matrix[j] = 0;
    }
  }

  return res;
};

const _reformatScores = scores => {
  const reformated = {};
  scores.forEach(score => {
    for (const key in score) {
      if (score.hasOwnProperty(key)) {
        reformated[key] = score[key];
      }
    }
  });

  return reformated;
};

const createConfuseMat = scores => {
  logger.log('silly', 'createConfuseMat');
  const clusters = _retrieveClusters(scores);
  const res = _createResMatrix(clusters);

  scores = _reformatScores(scores);

  for (const ivTest in scores) {
    if (scores.hasOwnProperty(ivTest)) {
      const expectedCluster = ivTest.split('-')[0];
      let sortable = [];
      for (const cluster in scores[ivTest]) {
        if (scores[ivTest].hasOwnProperty(cluster)) {
          sortable.push([cluster, scores[ivTest][cluster].scores[0]]);
        }
      }
      sortable.sort((a, b) => b[1] - a[1]);
      res[expectedCluster].samples++;
      res[expectedCluster].matrix[sortable[0][0]]++;
    }
  }
  return res;
};

const csvConfuseMat = (confuseMat, outputName = '') => {
  logger.log('silly', 'csvConfuseMat');
  console.log(confuseMat);
  let writeBuffer = ',nbSamples';
  for (const cluster in confuseMat) {
    if (confuseMat.hasOwnProperty(cluster)) {
      writeBuffer += `,${cluster}`;
    }
  }

  for (const cluster in confuseMat) {
    if (confuseMat.hasOwnProperty(cluster)) {
      writeBuffer += '\n' + `${cluster},${confuseMat[cluster].samples}`;
      for (const testCluster in confuseMat[cluster].matrix) {
        if (confuseMat[cluster].matrix.hasOwnProperty(testCluster)) {
          writeBuffer += `,${confuseMat[cluster].matrix[testCluster]}`;
        }
      }
    }
  }

  return fs.writeFileAsync(
    `${ivectorsPath}/save_scores/0_${outputName || 'confuseMat'}.csv`,
    writeBuffer);
};

export {
  countMean,
  countMeanAVG,
  countMeanMatch,
  createConfuseMat,
  csvConfuseMat
};

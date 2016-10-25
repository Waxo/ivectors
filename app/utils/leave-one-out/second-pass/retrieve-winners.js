import {logger} from '../../logger';
import {parseResults} from '../../parser';
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const pldaScores = `${ivectorsPath}/scores_PldaNorm`;
const sphScores = `${ivectorsPath}/scores_sphNorm`;
const baseInputPath = `${ivectorsPath}/3_LeaveOneOut/0_input`;

const retrieveList = (clusterName, results) => {
  logger.log('silly', 'retrieveList');
  const clusterRecognized = new Set();
  results.forEach(result => {
    const sortable = [];
    for (const ivTest in result) {
      if (result.hasOwnProperty(ivTest)) {
        for (const cluster in result[ivTest]) {
          if (result[ivTest].hasOwnProperty(cluster)) {
            sortable.push([cluster, result[ivTest][cluster].scores[0]]);
          }

        }
        sortable.sort((a, b) => b[1] - a[1]);
        if (sortable[0][0] === clusterName) {
          clusterRecognized.add(ivTest);
        }
      }
    }
  });
  return clusterRecognized;
};

const retrievePlda = (clusterName, files) => {
  logger.log('silly', 'retrievePlda');
  return BluebirdPromise.map(files,
    file => parseResults(`${pldaScores}/${file}`))
    .then(results => retrieveList(clusterName, results));
};

const retrieveSph = (clusterName, files) => {
  logger.log('silly', 'retrieveSph');
  return BluebirdPromise.map(files,
    file => parseResults(`${sphScores}/${file}`))
    .then(results => retrieveList(clusterName, results));
};

const retrieveWinners = clusterName => {
  logger.log('silly', 'retrieveWinners');
  return fs.readdirAsync(pldaScores)
    .then(files => {
      files = files.filter(name => name.indexOf(clusterName) === 0);
      return new BluebirdPromise.all([retrievePlda(clusterName, files),
        retrieveSph(clusterName, files)]);
    })
    .then(res => new Set([...res[0], ...res[1]]));
};

const createList = (clusterName, list) => {
  logger.log('silly', 'createList');
  return fs.readdirAsync(`${baseInputPath}/${clusterName}`)
    .then(filesList => {
      return [...list].map(value => {
        const index = Number(value.split('-')[1]);
        return [`${filesList[index].split('-')[0]}`, filesList[index],
          filesList[index].replace('.wav', '')];
      });
    });
};

export {retrieveWinners, createList};

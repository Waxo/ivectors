const fork = require('child_process').fork;
const numCPUs = require('os').cpus().length;
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const ProgressBar = require('progress');
const {inputPath} = require('../../config/environment');
const {logger} = require('../utils/logger');
const {extractLabel} = require('./parametrize-sound');

const getFilesByCluster_ = layer => {
  const arrayClusters = new Array(...layer.clusters);
  if (layer.aggregateClusters) {
    layer.aggregateClusters.forEach(aggregatedCluster => {
      arrayClusters.push(...aggregatedCluster[1]);
    });
  }
  return BluebirdPromise.map(arrayClusters,
    cluster => fs.readdirAsync(`${inputPath}/${cluster}`)
      .then(files => files.map(file => `${inputPath}/${cluster}/${file}`)));
};

const retrieveFiles = layer => {
  return getFilesByCluster_(layer)
    .then(files => {
      const concatenatedFiles = [];
      files.forEach(cluster => concatenatedFiles.push(...cluster));
      return concatenatedFiles;
    });
};

const parametrizeClusters = (files, layer, output = null) => {
  const childrenPromises = [];
  const arrayFiles = new Array(...files);
  const barInfo = '[:bar] :percent :current/:total :etas :elapseds';
  const bar = new ProgressBar(
    `Creating PRM for ${layer.wbName} layer : ${barInfo}`,
    {
      complete: '=',
      incomplete: ' ',
      width: 20,
      total: arrayFiles.length
    });

  for (let i = 0; i < numCPUs; i++) {
    const child = fork(`${process.cwd()}/app/learn/parametrize-threads.js`);

    childrenPromises.push(new BluebirdPromise(resolve => {
      child.on('message', msg => {
        switch (msg.type) {
          case 'ready':
            if (arrayFiles.length === 0) {
              child.send({type: 'terminate'});
            } else {
              bar.tick();
              child.send({type: 'data', file: arrayFiles.pop(), layer, output});
            }
            break;
          /* istanbul ignore next */
          default:
            logger.log('error', `Master: Message not recognized : ${msg.type}`);
            break;
        }
      });

      child.on('exit', () => {
        resolve();
      });
    }));
  }

  return BluebirdPromise.all(childrenPromises);
};

const linkPRMFiles = layer => {
  return fs.removeAsync(layer.paths.prm)
    .then(() => fs.ensureSymlinkAsync(layer.prmInput, layer.paths.prm))
    .then(() => retrieveFiles(layer))
    .then(filesPath => {
      return BluebirdPromise.map(filesPath, path => {
        const file = path.split('/').pop().replace('.wav', '');
        return extractLabel(path, file, layer.paths.lbl);
      });
    });
};

module.exports = {retrieveFiles, parametrizeClusters, linkPRMFiles};

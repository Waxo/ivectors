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
    .then(() => fs.readdirAsync(layer.prmInput))
    .then(files => BluebirdPromise.map(files,
      file => fs.ensureSymlinkAsync(`${layer.prmInput}/${file}`,
        `${layer.paths.prm}/${file}`)))
    .then(() => retrieveFiles(layer))
    .then(filesPath => {
      return BluebirdPromise.map(filesPath, path => {
        const file = path.split('/').pop().replace('.wav', '');
        return extractLabel(path, file, layer.paths.lbl);
      });
    });
};

const linkPRMWorkbench = (layer, workbenches) => {
  return BluebirdPromise.map(workbenches, wb => {
    return fs.copyAsync(layer.paths.prm, wb.prm);
  });
};

const linkTestPRM = (workbenches, inputDir) => {
  return BluebirdPromise.map(workbenches, wb => {
    return fs.readdirAsync(wb.test)
      .then(files => {
        files = files.map(file => file.replace('wav', 'prm'));
        return BluebirdPromise.map(files,
          file => fs.removeAsync(`${wb.prm}/${file}`).then(
            () => fs.ensureSymlinkAsync(`${inputDir}/${file}`,
              `${wb.prm}/${file}`)));
      });
  });
};

module.exports = {
  retrieveFiles,
  parametrizeClusters,
  linkPRMFiles,
  linkPRMWorkbench,
  linkTestPRM
};

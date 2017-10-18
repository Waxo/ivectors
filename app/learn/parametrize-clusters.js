const fork = require('child_process').fork;
const numCPUs = require('os').cpus().length;
const BluebirdPromise = require('bluebird');
const fs = require('fs-extra');
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
    cluster => fs.readdir(`${inputPath}/${cluster}`)
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
  return fs.remove(layer.paths.prm)
    .then(() => fs.readdir(layer.prmInput))
    .then(files => BluebirdPromise.map(files,
      file => fs.ensureSymlink(`${layer.prmInput}/${file}`,
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
    return fs.copy(layer.paths.prm, wb.prm);
  });
};

const linkTestPRM = (workbenches, inputDir) => {
  return BluebirdPromise.map(workbenches, wb => {
    return fs.readdir(wb.test)
      .then(files => {
        files = files.map(file => file.replace('wav', 'prm'));
        return BluebirdPromise.map(files,
          file => fs.remove(`${wb.prm}/${file}`).then(
            () => fs.ensureSymlink(`${inputDir}/${file}`,
              `${wb.prm}/${file}`)));
      });
  });
};

const linkTestNoise_ = (wb, file, suffixList) => {
  return BluebirdPromise.map(suffixList, suffix => {
    const noiseName = file.replace('.', `_${suffix}.`);
    return fs.ensureSymlink(`${wb.test}/${file}`, `${wb.test}/${noiseName}`);
  });
};

const relinkFiles = (workbenches, suffixList) => {

  return BluebirdPromise.map(workbenches, wb => {
    return fs.readdir(wb.test)
      .then(fileList => {
        return BluebirdPromise.map(fileList,
          file => linkTestNoise_(wb, file, suffixList));
      });
  });
};

const linkNoises = (layer, noiseDirs) => {
  const filesToLink = [];
  const suffixList = [];
  return fs.readdir(layer.paths.prm)
    .then(files => {
      filesToLink.push(...files);
      return BluebirdPromise.map(noiseDirs,
        noiseDir => fs.readdir(
          `${process.cwd()}/${noiseDir}/l${layer.wbName}`));
    })
    .then(filesLists => {
      const promisesLink = [];
      filesLists.forEach((list, idx) => {
        const suffix = list[0].split('_')[1].replace('.prm', '');
        suffixList.push(suffix);
        promisesLink.push(BluebirdPromise.map(filesToLink, file => {
          const [name, ext] = file.split('.');
          const fileName = `${name}_${suffix}.${ext}`;
          return fs.ensureSymlink(
            `${process.cwd()}/${noiseDirs[idx]}/l${layer.wbName}/${fileName}`,
            `${layer.paths.prm}/${fileName}`);
        }));
      });
      return BluebirdPromise.all(promisesLink);
    })
    .then(() => suffixList);
};

module.exports = {
  retrieveFiles,
  parametrizeClusters,
  linkPRMFiles,
  linkPRMWorkbench,
  linkTestPRM,
  relinkFiles,
  linkNoises
};

import {logger} from '../../logger';
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/ivectors`;
const leaveOnePath = `${ivectorsPath}/3_LeaveOneOut`;
const inputPath = `${leaveOnePath}/0_input`;
const prmPath = `${leaveOnePath}/1_prmInput`;
const secondPath = `${leaveOnePath}/2_secondPass`;
const secondPRMPath = `${leaveOnePath}/3_secondPassPRM`;

const aggregateClusters = clusterName => {
  logger.log('silly', 'aggregateClusters');
  let clusters;
  let fileList;
  return fs.removeAsync(secondPath)
    .then(() => fs.removeAsync(secondPRMPath))
    .then(() => fs.readdirAsync(`${inputPath}/${clusterName}`))
    .then(files => {
      fileList = files;
      clusters = new Set(fileList.map(file => file.split('-')[0]));
      return new BluebirdPromise.map(clusters, cluster => fs.mkdirsAsync(
        `${secondPath}/${cluster}`)
        .then(() => fs.mkdirsAsync(`${secondPRMPath}/${cluster}`)));
    })
    .then(() => {
      return new BluebirdPromise.map(fileList, file => fs.copyAsync(
        `${inputPath}/${clusterName}/${file}`,
        `${secondPath}/${file.split('-')[0]}/${file}`)
        .then(() => fs.copyAsync(
          `${prmPath}/${clusterName}/${file.replace('wav', 'prm')}`,
          `${secondPRMPath}/${file.split('-')[0]}/${file.replace('wav',
            'prm')}`)));
    });
};

export {aggregateClusters};

import {execAsync} from "./exec-async";

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const leaveOnePath = `${ivectorsPath}/3_LeaveOneOut`;
const ndxPath = `${leaveOnePath}/ndx`;
const exePath = `${leaveOnePath}/exe`;
const matrixPath = `${leaveOnePath}/mat`;
const iv = `${leaveOnePath}/iv`;

const createIVTest = (currentName, thread = '') => {
  return fs.readdirAsync(`${iv}/${thread}/raw/`)
    .then(ivTrain => {
      const regExt = /\.y/g;
      currentName = currentName.replace('.lst', '');
      const classes =
        ivTrain.join(' ').replace(regExt, '').replace(`${currentName} `, '');
      return fs.writeFileAsync(`${ndxPath}/ivTest${thread}.ndx`,
        `${currentName} ${classes}`);
    });
};

const normalize = (thread = '') => {
  console.log('Normalize');
  return fs.mkdirsAsync(`${iv}/${thread}/lengthNorm`)
    .then(() => fs.readdirAsync(`${iv}/${thread}/raw`))
    .then(ivectors => fs.writeFileAsync(`${ndxPath}/all${thread}.lst`,
      ivectors.join('\n').replace(/\.y/g, '')))
    .then(() => {
      const command = `${exePath}/05_1_IvNorm`;
      const options = [
        `--config ${leaveOnePath}/cfg/05_1_PLDA_ivNorm.cfg`,
        `--saveVectorFilesPath ${iv}/${thread}/lengthNorm/`,
        `--loadVectorFilesPath ${iv}/${thread}/raw/`,
        `--matrixFilesPath ${matrixPath}/${thread}/`,
        `--backgroundNdxFilename ${ndxPath}/Plda${thread}.ndx`,
        `--inputVectorFilename ${ndxPath}/all${thread}.lst`
      ];

      let execute = `${command} ${options.join(' ')}`;
      return execAsync(execute);
    });
};

const pldaTraining = (thread = '') => {
  console.log('PLDA Training');
  const command = `${exePath}/05_2_PLDA`;
  const options = [
    `--config ${leaveOnePath}/cfg/05_2_PLDA_Plda.cfg`,
    `--testVectorFilesPath ${iv}/${thread}/lengthNorm/`,
    `--loadVectorFilesPath ${iv}/${thread}/lengthNorm/`,
    `--matrixFilesPath ${matrixPath}/${thread}/`,
    `--backgroundNdxFilename ${ndxPath}/Plda${thread}.ndx`
  ];

  let execute = `${command} ${options.join(' ')}`;
  return execAsync(execute);
};

const scorePLDANorm = (currentName, thread = '') => {
  console.log('PLDA Norm');
  const outputName = `${currentName}.txt`;
  const command = `${exePath}/06_IvTest`;
  const options = [
    `--config ${leaveOnePath}/cfg/05_3_PLDA_ivTest_Plda.cfg`,
    `--testVectorFilesPath ${iv}/${thread}/lengthNorm/`,
    `--loadVectorFilesPath ${iv}/${thread}/lengthNorm/`,
    `--matrixFilesPath ${matrixPath}/${thread}/`,
    `--outputFilename ${ivectorsPath}/scores_PldaNorm/${outputName}`,
    `--backgroundNdxFilename ${ndxPath}/Plda${thread}.ndx`,
    `--targetIdList ${ndxPath}/TrainModel${thread}.ndx`,
    `--ndxFilename ${ndxPath}/ivTest${thread}.ndx`
  ];

  let execute = `${command} ${options.join(' ')}`;

  return createIVTest(currentName, thread)
    .then(() => execAsync(execute));
};

const scoreCosine = (currentName, thread = '') => {
  console.log('Cosine');
  const outputName = `${currentName}.txt`;
  const command = `${exePath}/06_IvTest`;
  let options = [
    `--config ${leaveOnePath}/cfg/06_cos_ivTest_WCCN_Cosine.cfg`,
    `--testVectorFilesPath ${iv}/${thread}/raw/`,
    `--loadVectorFilesPath ${iv}/${thread}/raw/`,
    `--matrixFilesPath ${matrixPath}/${thread}/`,
    `--outputFilename ${ivectorsPath}/scores_wccn/${outputName}`,
    `--backgroundNdxFilename ${ndxPath}/Plda${thread}.ndx`,
    `--targetIdList ${ndxPath}/TrainModel${thread}.ndx`,
    `--ndxFilename ${ndxPath}/ivTest${thread}.ndx`
  ];

  let execute = `${command} ${options.join(' ')}`;
  return execAsync(execute);
};

const scoreEFR = (currentName, thread ='') => {
  console.log('EFR');
  const outputName = `${currentName}.txt`;
  const command = `${exePath}/06_IvTest`;

  let options = [
    `--config ${leaveOnePath}/cfg/07_EFR_ivTest_EFR_Mahalanobis.cfg`,
    `--testVectorFilesPath ${iv}/${thread}/raw/`,
    `--loadVectorFilesPath ${iv}/${thread}/raw/`,
    `--matrixFilesPath ${matrixPath}/${thread}/`,
    `--outputFilename ${ivectorsPath}/scores_mahalanobis/${outputName}`,
    `--backgroundNdxFilename ${ndxPath}/Plda${thread}.ndx`,
    `--targetIdList ${ndxPath}/TrainModel${thread}.ndx`,
    `--ndxFilename ${ndxPath}/ivTest${thread}.ndx`
  ];

  let execute = `${command} ${options.join(' ')}`;
  return execAsync(execute);
};

const scoreSphNorm = (currentName, thread = '') => {
  console.log('SphNorm Plda');
  const outputName = `${currentName}.txt`;
  const command = `${exePath}/06_IvTest`;
  let options = [
    `--config ${leaveOnePath}/cfg/08_sph_ivTest_SphNorm_Plda.cfg`,
    `--testVectorFilesPath ${iv}/${thread}/raw/`,
    `--loadVectorFilesPath ${iv}/${thread}/raw/`,
    `--matrixFilesPath ${matrixPath}/${thread}/`,
    `--outputFilename ${ivectorsPath}/scores_sphNorm/${outputName}`,
    `--backgroundNdxFilename ${ndxPath}/Plda${thread}.ndx`,
    `--targetIdList ${ndxPath}/TrainModel${thread}.ndx`,
    `--ndxFilename ${ndxPath}/ivTest${thread}.ndx`
  ];

  let execute = `${command} ${options.join(' ')}`;
  return execAsync(execute);
};

export {
  normalize,
  pldaTraining,
  scorePLDANorm,
  scoreCosine,
  scoreEFR,
  scoreSphNorm
};

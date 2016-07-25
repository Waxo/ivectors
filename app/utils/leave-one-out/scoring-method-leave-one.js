import {execAsync} from "../exec-async";

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

const scoring = (name, thread, cfg, output, ndxFile, norm = false) => {
  const threadPath = `${leaveOnePath}/threads/${thread}`;
  const outputName = `${name[2]}.txt`;
  const outDir = (output) ? `${ivectorsPath}/${output}/${outputName}` :
    '/dev/null';

  const score = [
    `${exePath}/06_IvTest`,
    `--config ${leaveOnePath}/cfg/${cfg}`,
    `--testVectorFilesPath ${threadPath}/iv/${norm ? 'lengthNorm' : 'raw'}`,
    `--loadVectorFilesPath ${threadPath}/iv/${norm ? 'lengthNorm' : 'raw'}`,
    `--matrixFilesPath ${threadPath}/mat/`,
    `--outputFilename ${outDir}`,
    `--backgroundNdxFilename ${threadPath}/Plda.ndx`,
    `--targetIdList ${threadPath}/TrainModel.ndx`,
    `--ndxFilename ${threadPath}/${ndxFile}`
  ];
  return execAsync(score.join(' '));
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

      const execute = `${command} ${options.join(' ')}`;
      return execAsync(execute);
    });
};

const normalizePLDA = thread => {
  const threadPath = `${leaveOnePath}/threads/${thread}`;
  return fs.readdirAsync(`${threadPath}/iv/raw`)
    .then(ivectors => fs.writeFileAsync(`${threadPath}/all.lst`,
      ivectors.join('\n').replace(/\.y/g, '')))
    .then(() => {
      const normPLDA = [
        `${exePath}/05_1_IvNorm`,
        `--config ${leaveOnePath}/cfg/05_1_PLDA_ivNorm.cfg`,
        `--saveVectorFilesPath ${threadPath}/iv/lengthNorm/`,
        `--loadVectorFilesPath ${threadPath}/iv/raw/`,
        `--matrixFilesPath ${threadPath}/mat/`,
        `--backgroundNdxFilename ${threadPath}/Plda.ndx`,
        `--inputVectorFilename ${threadPath}/all.lst`
      ];

      return execAsync(normPLDA.join(' '));
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

  const execute = `${command} ${options.join(' ')}`;
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

  const execute = `${command} ${options.join(' ')}`;

  return createIVTest(currentName, thread)
    .then(() => execAsync(execute));
};

const scorePLDA = (name, thread) => {
  const threadPath = `${leaveOnePath}/threads/${thread}`;
  const trainPLDA = [
    `${exePath}/05_2_PLDA`,
    `--config ${leaveOnePath}/cfg/05_2_PLDA_Plda.cfg`,
    `--testVectorFilesPath ${threadPath}/iv/lengthNorm/`,
    `--loadVectorFilesPath ${threadPath}/iv/lengthNorm/`,
    `--matrixFilesPath ${threadPath}/mat/`,
    `--backgroundNdxFilename ${threadPath}/Plda.ndx`
  ];

  return execAsync(trainPLDA.join(' '))
    .delay(1000).then(() => scoring(name, thread, '05_3_PLDA_ivTest_Plda.cfg',
      'scores_PldaNorm', 'ivTest.ndx', true));
};

const scoreCosine = (currentName, thread = '') => {
  console.log('Cosine');
  const outputName = `${currentName}.txt`;
  const command = `${exePath}/06_IvTest`;
  const options = [
    `--config ${leaveOnePath}/cfg/06_cos_ivTest_WCCN_Cosine.cfg`,
    `--testVectorFilesPath ${iv}/${thread}/lengthNorm/`,
    `--loadVectorFilesPath ${iv}/${thread}/lengthNorm/`,
    `--matrixFilesPath ${matrixPath}/${thread}/`,
    `--outputFilename ${ivectorsPath}/scores_wccn/${outputName}`,
    `--backgroundNdxFilename ${ndxPath}/Plda${thread}.ndx`,
    `--targetIdList ${ndxPath}/TrainModel${thread}.ndx`,
    `--ndxFilename ${ndxPath}/ivTest${thread}.ndx`
  ];

  const execute = `${command} ${options.join(' ')}`;
  return execAsync(execute);
};

const scoreEFR = (currentName, thread = '') => {
  console.log('EFR');
  const outputName = `${currentName}.txt`;
  const command = `${exePath}/06_IvTest`;

  const options = [
    `--config ${leaveOnePath}/cfg/07_EFR_ivTest_EFR_Mahalanobis.cfg`,
    `--testVectorFilesPath ${iv}/${thread}/lengthNorm/`,
    `--loadVectorFilesPath ${iv}/${thread}/lengthNorm/`,
    `--matrixFilesPath ${matrixPath}/${thread}/`,
    `--outputFilename ${ivectorsPath}/scores_mahalanobis/${outputName}`,
    `--backgroundNdxFilename ${ndxPath}/Plda${thread}.ndx`,
    `--targetIdList ${ndxPath}/TrainModel${thread}.ndx`,
    `--ndxFilename ${ndxPath}/ivTest${thread}.ndx`
  ];

  const execute = `${command} ${options.join(' ')}`;
  return execAsync(execute);
};

const scoreSphNorm = (currentName, thread = '') => {
  console.log('SphNorm Plda');
  const outputName = `${currentName}.txt`;
  const command = `${exePath}/06_IvTest`;
  const options = [
    `--config ${leaveOnePath}/cfg/08_sph_ivTest_SphNorm_Plda.cfg`,
    `--testVectorFilesPath ${iv}/${thread}/lengthNorm/`,
    `--loadVectorFilesPath ${iv}/${thread}/lengthNorm/`,
    `--matrixFilesPath ${matrixPath}/${thread}/`,
    `--outputFilename ${ivectorsPath}/scores_sphNorm/${outputName}`,
    `--backgroundNdxFilename ${ndxPath}/Plda${thread}.ndx`,
    `--targetIdList ${ndxPath}/TrainModel${thread}.ndx`,
    `--ndxFilename ${ndxPath}/ivTest${thread}.ndx`
  ];

  const execute = `${command} ${options.join(' ')}`;
  return execAsync(execute);
};

const createWCCN = (name, thread, norm = false) => {
  return scoring(name, thread, '06_cos_ivTest_WCCN_Cosine.cfg',
    false, 'ivTestMat.ndx', norm);
};

const scoreCosCat = (name, thread, norm = false) => {
  return scoring(name, thread, '06_cos_ivTest_WCCN_Cosine_no_load.cfg',
    'scores_wccn', 'ivTest.ndx', norm);
};

const createEFR = (name, thread, norm = false) => {
  return scoring(name, thread, '07_EFR_ivTest_EFR_Mahalanobis.cfg',
    false, 'ivTestMat.ndx', norm);
};

const scoreMahalanobis = (name, thread, norm = false) => {
  return scoring(name, thread, '07_EFR_ivTest_EFR_Mahalanobis_no_load.cfg',
    'scores_mahalanobis', 'ivTest.ndx', norm);
};

const createSph = (name, thread, norm = false) => {
  return scoring(name, thread, '08_sph_ivTest_SphNorm_Plda.cfg',
    false, 'ivTestMat.ndx', norm);
};

const scoreSph = (name, thread, norm = false) => {
  return scoring(name, thread, '08_sph_ivTest_SphNorm_Plda_no_load.cfg',
    'scores_sphNorm', 'ivTest.ndx', norm);
};

export {
  normalize,
  pldaTraining,
  scorePLDANorm,
  scoreCosine,
  scoreEFR,
  scoreSphNorm,
  normalizePLDA,
  scorePLDA,
  createWCCN,
  scoreCosCat,
  createEFR,
  scoreMahalanobis,
  createSph,
  scoreSph
};
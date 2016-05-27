import {execAsync} from "./exec-async";

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const pldaNorm = `${ivectorsPath}/2_1_PLDA_Norm`;
const cosine = `${ivectorsPath}/2_2_WCCN`;
const mahalanobis = `${ivectorsPath}/2_3_Mahalanobis`;
const sphNorm = `${ivectorsPath}/2_4_SphNorm_PLDA`;

const createIVTest = currentName => {
  return fs.readdirAsync(`${ivectorsPath}/iv/raw/`)
    .then(ivTrain => {
      const regExt = /\.y/g;
      currentName = currentName.replace('.lst', '');
      const classes =
        ivTrain.join(' ').replace(regExt, '').replace(`${currentName} `, '');
      return fs.writeFileAsync(`${pldaNorm}/ivTest.ndx`,
        `${currentName} ${classes}`);
    });
};

const normalize = () => {
  console.log('Normalize');
  return fs.mkdirsAsync(`${ivectorsPath}/iv/lengthNorm`)
    .then(() => fs.readdirAsync(`${ivectorsPath}/iv/raw`))
    .then(ivectors => fs.writeFileAsync(`${ivectorsPath}/all.lst`,
      ivectors.join('\n').replace(/\.y/g, '')))
    .then(() => {
      const command = `${pldaNorm}/IvNorm`;
      const options = [
        `--config ${pldaNorm}/cfg/ivNorm.cfg`,
        `--saveVectorFilesPath ${ivectorsPath}/iv/lengthNorm/`,
        `--loadVectorFilesPath ${ivectorsPath}/iv/raw/`,
        `--matrixFilesPath ${ivectorsPath}/mat/`,
        `--backgroundNdxFilename ${ivectorsPath}/Plda.ndx`,
        `--inputVectorFilename ${ivectorsPath}/all.lst`
      ];

      let execute = `${command} ${options.join(' ')}`;
      return execAsync(execute);
    });
};

const pldaTraining = () => {
  console.log('PLDA Training');
  const command = `${pldaNorm}/PLDA`;
  const options = [
    `--config ${pldaNorm}/cfg/Plda.cfg`,
    `--testVectorFilesPath ${ivectorsPath}/iv/lengthNorm/`,
    `--loadVectorFilesPath ${ivectorsPath}/iv/lengthNorm/`,
    `--matrixFilesPath ${ivectorsPath}/mat/`,
    `--backgroundNdxFilename ${ivectorsPath}/Plda.ndx`
  ];

  let execute = `${command} ${options.join(' ')}`;
  return execAsync(execute);
};

const scorePLDANorm = currentName => {
  console.log('PLDA Norm');
  const outputName = `${currentName}.txt`;
  const command = `${ivectorsPath}/IvTest`;
  const options = [
    `--config ${pldaNorm}/cfg/ivTest_Plda.cfg`,
    `--testVectorFilesPath ${ivectorsPath}/iv/raw/`,
    `--loadVectorFilesPath ${ivectorsPath}/iv/raw/`,
    `--matrixFilesPath ${ivectorsPath}/mat/`,
    `--outputFilename ${ivectorsPath}/scores_PldaNorm/${outputName}`,
    `--backgroundNdxFilename ${ivectorsPath}/Plda.ndx`,
    `--targetIdList ${ivectorsPath}/TrainModel.ndx`,
    `--ndxFilename ${pldaNorm}/ivTest.ndx`
  ];

  let execute = `${command} ${options.join(' ')}`;

  return createIVTest(currentName)
    .then(() => execAsync(execute));
};

const scoreCosine = currentName => {
  console.log('Cosine');
  const outputName = `${currentName}.txt`;
  const command = `${ivectorsPath}/IvTest`;
  let options = [
    `--config ${cosine}/cfg/ivTest_WCCN_Cosine.cfg`,
    `--testVectorFilesPath ${ivectorsPath}/iv/raw/`,
    `--loadVectorFilesPath ${ivectorsPath}/iv/raw/`,
    `--matrixFilesPath ${ivectorsPath}/mat/`,
    `--outputFilename ${ivectorsPath}/scores_wccn/${outputName}`,
    `--backgroundNdxFilename ${ivectorsPath}/Plda.ndx`,
    `--targetIdList ${ivectorsPath}/TrainModel.ndx`,
    `--ndxFilename ${pldaNorm}/ivTest.ndx`
  ];

  let execute = `${command} ${options.join(' ')}`;
  return execAsync(execute);
};

const scoreEFR = currentName => {
  console.log('EFR');
  const outputName = `${currentName}.txt`;
  const command = `${ivectorsPath}/IvTest`;

  let options = [
    `--config ${mahalanobis}/cfg/ivTest_EFR_Mahalanobis.cfg`,
    `--testVectorFilesPath ${ivectorsPath}/iv/raw/`,
    `--loadVectorFilesPath ${ivectorsPath}/iv/raw/`,
    `--matrixFilesPath ${ivectorsPath}/mat/`,
    `--outputFilename ${ivectorsPath}/scores_mahalanobis/${outputName}`,
    `--backgroundNdxFilename ${ivectorsPath}/Plda.ndx`,
    `--targetIdList ${ivectorsPath}/TrainModel.ndx`,
    `--ndxFilename ${pldaNorm}/ivTest.ndx`
  ];

  let execute = `${command} ${options.join(' ')}`;
  return execAsync(execute);
};

const scoreSphNorm = currentName => {
  console.log('SphNorm Plda');
  const outputName = `${currentName}.txt`;
  const command = `${ivectorsPath}/IvTest`;
  let options = [
    `--config ${sphNorm}/cfg/ivTest_SphNorm_Plda.cfg`,
    `--testVectorFilesPath ${ivectorsPath}/iv/raw/`,
    `--loadVectorFilesPath ${ivectorsPath}/iv/raw/`,
    `--matrixFilesPath ${ivectorsPath}/mat/`,
    `--outputFilename ${ivectorsPath}/scores_sphNorm/${outputName}`,
    `--backgroundNdxFilename ${ivectorsPath}/Plda.ndx`,
    `--targetIdList ${ivectorsPath}/TrainModel.ndx`,
    `--ndxFilename ${pldaNorm}/ivTest.ndx`
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

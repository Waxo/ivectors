import {execAsync} from "./exec-async";

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const prmPath = `${ivectorsPath}/prm`;
const lblPath = `${ivectorsPath}/lbl`;
const gmmPath = `${ivectorsPath}/gmm`;
const UBMPath = `${ivectorsPath}/0_2_UBM_TotalVariability`;
const matrixPath = `${ivectorsPath}/mat`;

const cleanGMM = () => {
  return fs.removeAsync(gmmPath)
    .then(() => fs.mkdirAsync(gmmPath));
};

const cleanTV = () => {
  return fs.removeAsync(matrixPath)
    .then(() => fs.mkdirAsync(matrixPath));
};

const trainUBM = inputFile => {
  console.log(`Train UBM ${inputFile}`);
  return cleanGMM().then(() => {
    let command = `${UBMPath}/TrainWorld`;
    let options = [
      `--config ${UBMPath}/cfg/TrainWorld.cfg`,
      `--inputFeatureFilename ${ivectorsPath}/lst/${inputFile}`,
      `--featureFilesPath ${prmPath}/`,
      `--labelFilesPath ${lblPath}`,
      `--mixtureFilesPath ${gmmPath}/`
    ];

    let execute = `${command} ${options.join(' ')}`;
    return execAsync(execute);
  });
};

const trainTotalVariability = inputFile => {
  console.log(`Train TV`);
  fs.createReadStream(`${ivectorsPath}/lst/${inputFile}`)
    .pipe(fs.createWriteStream(`${UBMPath}/totalvariability.ndx`));
  return cleanTV().then(() => {
    let command = `${UBMPath}/TotalVariability`;
    let options = [
      `--config ${UBMPath}/cfg/TotalVariability_fast.cfg`,
      `--featureFilesPath ${prmPath}/`,
      `--labelFilesPath ${lblPath}/`,
      `--mixtureFilesPath ${gmmPath}/`,
      `--matrixFilesPath ${ivectorsPath}/mat/`,
      `--ndxFilename ${UBMPath}/totalvariability.ndx`
    ];

    let execute = `${command} ${options.join(' ')}`;
    return execAsync(execute);
  });
};

export {trainUBM, trainTotalVariability};

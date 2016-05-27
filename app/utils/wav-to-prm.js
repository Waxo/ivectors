import SPro from '../ivectors/0_1_Prepare_PRM/Spro';
import {execAsync} from "./exec-async";

const BluebirdPromise = require('bluebird');

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const wavToPRMPath = `${ivectorsPath}/0_1_Prepare_PRM`;
const prmPath = `${ivectorsPath}/prm`;
const lblPath = `${ivectorsPath}/lbl`;

const wavToPRM = () => {
  console.log('wav to prm');

  return new BluebirdPromise(resolve => {
    const spro = SPro.create({
      path: ivectorsPath,
      specificPath: wavToPRMPath,
      input: `${wavToPRMPath}/input`,
      output: prmPath,
      label: lblPath,
      isDone: false
    });

    spro.addObserver('isDone', () => {
      if (spro.get('isDone')) {
        resolve();
      }
    });
  });
};

const normEnergy = () => {
  console.log('Norm Energy');
  let command = `${wavToPRMPath}/NormFeat`;
  let options = [
    `--config ${wavToPRMPath}/cfg/NormFeat_energy.cfg`,
    `--inputFeatureFilename ${ivectorsPath}/data.lst`,
    `--featureFilesPath ${prmPath}/`
  ];

  let execute = `${command} ${options.join(' ')}`;
  return execAsync(execute);
};

const normFeatures = () => {
  console.log('Norm Features');
  let command = `${wavToPRMPath}/NormFeat`;
  let options = [
    `--config ${wavToPRMPath}/cfg/NormFeat.cfg`,
    `--inputFeatureFilename ${ivectorsPath}/data.lst`,
    `--featureFilesPath ${prmPath}/`,
    `--labelFilesPath ${lblPath}/`
  ];

  let execute = `${command} ${options.join(' ')}`;
  return execAsync(execute);
};

export {wavToPRM, normEnergy, normFeatures};

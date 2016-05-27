import {execAsync} from "./exec-async";

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const extractIVPath = `${ivectorsPath}/0_3_Extract_Classes`;

const prmPath = `${ivectorsPath}/prm`;
const lblPath = `${ivectorsPath}/lbl`;
const gmmPath = `${ivectorsPath}/gmm`;
const matrixPath = `${ivectorsPath}/mat`;
const iv = `${ivectorsPath}/iv`;

const cleanIV = () => {
  return fs.removeAsync(iv)
    .then(() => fs.mkdirsAsync(`${iv}/raw`));
};

const pad = function (num, size) {
  let s = num + '';
  while (s.length < size) {
    s = '0' + s;
  }
  return s;
};

const prepareIVectorsExtractor = (currentName, newName) => {
  console.log('Prepare IV');
  currentName = currentName.replace('.lst', '');
  return fs.readFileAsync(`${ivectorsPath}/data.lst`)
    .then(data => {
      data = data.toString().split('\n');
      let ndx = '';
      let plda = '';
      let trainModel = '';
      let currentClass = '';
      let index = 0;
      data.forEach(line => {
        if (line) {
          let [className, fileName] = line.split('/');
          if (currentClass !== className) {
            currentClass = className;
            index = 0;
            if (plda) {
              plda += '\n';
            }
          }
          const filename = `${className}-${pad(index++, 5)}`;
          ndx += `${filename} ${line}` + '\n';
          if (fileName !== currentName) {
            plda += `${filename} `;
            trainModel += `${filename} ${filename}` + '\n';
          } else {
            newName.name = filename;
          }
        }
      });
      fs.writeFileSync(`${ivectorsPath}/Plda.ndx`, plda);
      fs.writeFileSync(`${ivectorsPath}/TrainModel.ndx`, trainModel);
      return fs.writeFileAsync(`${extractIVPath}/ivExtractor.ndx`, ndx);
    });
};

const extractIV = () => {
  console.log('Extract IVectors');
  return cleanIV()
    .then(() => {
      let command = `${extractIVPath}/IvExtractor`;
      let options = [
        `--config ${extractIVPath}/cfg/ivExtractor_fast.cfg`,
        `--featureFilesPath ${prmPath}/`,
        `--labelFilesPath ${lblPath}/`,
        `--mixtureFilesPath ${gmmPath}/`,
        `--matrixFilesPath ${matrixPath}/`,
        `--saveVectorFilesPath ${iv}/raw/`,
        `--targetIdList ${extractIVPath}/ivExtractor.ndx`
      ];

      let execute = `${command} ${options.join(' ')}`;
      return execAsync(execute);
    });
};

export {prepareIVectorsExtractor, extractIV};

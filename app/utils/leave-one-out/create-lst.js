import {pad} from '../pad';

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const ivectorsPath = `${process.cwd()}/ivectors`;
const LSTPath = `${ivectorsPath}/lst`;
const leaveOnePath = `${ivectorsPath}/3_LeaveOneOut`;
const ndxDependent = `${leaveOnePath}/common/ndx`;

const createLST = () => {
  return fs.removeAsync(LSTPath)
    .finally(() => fs.mkdirAsync(LSTPath))
    .then(() => fs.readFileAsync(`${ivectorsPath}/data.lst`))
    .then(data => {
      const fileList = data.toString().split('\n');
      return BluebirdPromise.map(fileList, file => {
        if (file) {
          return fs.writeFileAsync(`${LSTPath}/${file.split('/')[1]}.lst`,
            data.toString().replace(`${file}\n`, ''));
        }
      });
    });
};

const createDependentLST = () => {
  let inputClasses = [];
  return fs.readdirAsync(`${leaveOnePath}/0_input`)
    .then(clusters => {
      const readDir = [];
      inputClasses = clusters;
      clusters.forEach(cluster => {
        readDir.push(fs.readdirAsync(`${leaveOnePath}/0_input/${cluster}`));
      });
      return BluebirdPromise.all(readDir);
    })
    .then(dirs => {
      console.log(inputClasses);
      const LSTWriter = [];
      dirs.forEach((dir, idx) => {
        const write = `${inputClasses[idx]}/${dir.join(
          '\n' + `${inputClasses[idx]}/`)}`.replace(/\.wav/g, '');
        LSTWriter.push(
          fs.writeFileAsync(
            `${leaveOnePath}/common/lst/${inputClasses[idx]}_data.lst`,
            write));
        LSTWriter.push(fs.writeFileAsync(
          `${leaveOnePath}/common/ndx/${inputClasses[idx]}_TV.ndx`,
          write));
      });
      return BluebirdPromise.all(LSTWriter);
    })
    .then(() => new BluebirdPromise(resolve => resolve(inputClasses)));
};

const createDependentNDX = clusters => {
  const fileWriter = [];
  return BluebirdPromise.map(clusters, cluster => fs.readFileAsync(
    `${leaveOnePath}/common/lst/${cluster}_data.lst`))
    .then(files => {
      files.forEach((file, idx) => {
        file = file.toString().split('\n');
        let plda = '';
        let extractor = '';
        let model = '';
        let index = 0;
        file.forEach(line => {
          const uttName = `${clusters[idx]}-${pad(index++, 5)}`;
          plda += `${uttName} `;
          extractor += `${uttName} ${line}` + '\n';
          model += `${uttName} ${uttName}` + '\n';
        });
        fileWriter.push(
          fs.writeFileAsync(`${ndxDependent}/${clusters[idx]}_plda.ndx`, plda));
        fileWriter.push(
          fs.writeFileAsync(`${ndxDependent}/${clusters[idx]}_extractor.ndx`,
            extractor));
        fileWriter.push(
          fs.writeFileAsync(`${ndxDependent}/${clusters[idx]}_trainmodel.ndx`,
            model));
      });
      return BluebirdPromise.all(fileWriter);
    });
};

export {createLST, createDependentLST, createDependentNDX};

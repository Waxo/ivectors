const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const foldDataLST_ = (layer, fold) => {
  return fs.ensureDirAsync(`${layer.paths.files}/f${fold}`)
    .then(() => fs.readdirAsync(`${layer.paths.input}/f${fold}`))
    .then(dirs => BluebirdPromise.map(dirs,
      dir => fs.readdirAsync(`${layer.paths.input}/f${fold}/${dir}`)))
    .then(results => {
      const catResults = [];
      results.forEach(result => {
        catResults.push(...result);
      });
      return fs.writeFileAsync(`${layer.paths.files}/f${fold}/data.lst`,
        catResults.join('\n').replace(/\.wav/g, ''));
    });
};

const foldIvExtractorNDX_ = (layer, fold) => {
  const foldInputPath = `${layer.paths.input}/f${fold}`;
  const clusters = [];

  return fs.readdirAsync(foldInputPath)
    .then(dirs => {
      clusters.push(...dirs);
      return BluebirdPromise.map(dirs,
        dir => fs.readdirAsync(`${foldInputPath}/${dir}`));
    })
    .then(filesLists => {
      const buffWrite = [];
      filesLists.forEach((list, index) => {
        buffWrite.push(`${clusters[index]} ${list.join(' ')}`);
      });
      return fs.writeFileAsync(`${layer.paths.files}/f${fold}/ivExtractor.ndx`,
        buffWrite.join('\n').replace(/\.wav/g, ''));
    });
};

const foldIvExtractorMatNDX_ = (layer, fold) => {
  const foldInputPath = `${layer.paths.input}/f${fold}`;
  const clusters = [];

  return fs.readdirAsync(foldInputPath)
    .then(dirs => {
      clusters.push(...dirs);
      return BluebirdPromise.map(dirs,
        dir => fs.readdirAsync(`${foldInputPath}/${dir}`));
    })
    .then(filesLists => {
      const buffWrite = [];
      filesLists.forEach(list => {
        buffWrite.push(list.map(element => `${element} ${element}`).join('\n'));
      });
      return fs.writeFileAsync(
        `${layer.paths.files}/f${fold}/ivExtractorMat.ndx`,
        buffWrite.join('\n').replace(/\.wav/g, ''));
    });
};

const writeDataLST = layer => {
  const foldsPromises = [];
  for (let i = 0; i < 10; i++) {
    foldsPromises.push(foldDataLST_(layer, i));
  }
  return BluebirdPromise.all(foldsPromises);
};

const writeTvNDX = layer => {
  const foldPromises = [];
  for (let i = 0; i < 10; i++) {
    foldPromises.push(
      fs.copyAsync(`${layer.paths.files}/f${i}/data.lst`,
        `${layer.paths.files}/f${i}/tv.ndx`));
  }
  return BluebirdPromise.all(foldPromises);
};

const writeIvExtractorNDX = layer => {
  const foldsPromises = [];
  for (let i = 0; i < 10; i++) {
    foldsPromises.push(foldIvExtractorNDX_(layer, i));
  }
  return BluebirdPromise.all(foldsPromises);
};

const writeIvExtractorMatNDX = layer => {
  const foldsPromises = [];
  for (let i = 0; i < 10; i++) {
    foldsPromises.push(foldIvExtractorMatNDX_(layer, i));
  }
  return BluebirdPromise.all(foldsPromises);
};

module.exports = {
  writeDataLST,
  writeTvNDX,
  writeIvExtractorNDX,
  writeIvExtractorMatNDX
};

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const {inputPath, layersRootPath} = require('../../config/environment');
const {splitter} = require('./splitter');

const splitLists_ = lists => {
  const splittedLists = [];
  lists.forEach(list => {
    splittedLists.push(splitter(list, 10));
  });
  return splittedLists;
};

const linkFiles_ = (layer, params, sInput = null) => {
  const inputDir = layer.paths.input;
  const testDir = layer.paths.test;

  const file = params.file;
  const clusters = params.clusters;
  const clusterIndex = params.clusterIndex;
  const foldIndex = params.foldIndex;

  const clusterName = clusters[clusterIndex];
  const input = `${inputPath}/${clusterName}/${file}`;
  const linkTest = `${testDir}/f${foldIndex}/${file}`;

  return fs.ensureSymlinkAsync(input, linkTest)
    .then(() => {
      const promisesOthers = [];
      for (let i = 0; i < 10; i++) {
        if (i !== foldIndex) {
          const linkInput = `${sInput ||
          inputDir}/f${i}/${clusterName}/${file}`;
          promisesOthers.push(fs.ensureSymlinkAsync(input, linkInput));
        }
      }
      return BluebirdPromise.all(promisesOthers);
    });
};

const dispatchFolds_ = (layer, clusters, filesLists, sInput = null) => {
  const foldsLists = splitLists_(filesLists);
  const promises = [];
  foldsLists.forEach((clusterFold, clusterIndex) => {
    clusterFold.forEach((fold, foldIndex) => {
      promises.push(BluebirdPromise.map(fold, file => linkFiles_(layer,
        {file, clusters, clusterIndex, foldIndex}, sInput)));
    });
  });
  return BluebirdPromise.all(promises)
    .then(() => foldsLists);
};

const dispatchAggregated_ = (foldLists, layer, cluster) => {
  const promises = [];
  foldLists.forEach((clusterFold, clusterIndex) => {
    clusterFold.forEach((fold, foldIndex) => {
      for (let i = 0; i < 10; i++) {
        if (i !== foldIndex) {
          promises.push(BluebirdPromise.map(fold, file => {
            const input = `${inputPath}/${cluster[1][clusterIndex]}/${file}`;
            const link = `${layer.paths.input}/f${i}/${cluster[0]}/${file}`;
            return fs.ensureSymlinkAsync(input, link);
          }));
        }
      }
    });
  });
  return BluebirdPromise.all(promises);
};

const aggregateFolds_ = layer => {
  return BluebirdPromise.map(layer.aggregateClusters,
    cluster => BluebirdPromise.map(cluster[1],
      c => fs.readdirAsync(`${inputPath}/${c}`))
      .then(filesLists => {
        const sInput = `${layersRootPath}/l${cluster[0]}/input`;
        return dispatchFolds_(layer, cluster[1], filesLists, sInput);
      })
      .then(foldLists => dispatchAggregated_(foldLists, layer, cluster))
  );
};

const clustersFolds_ = layer => {
  return BluebirdPromise.map(layer.clusters,
    cluster => fs.readdirAsync(`${inputPath}/${cluster}`))
    .then(filesLists => dispatchFolds_(layer, layer.clusters, filesLists));
};

const createFolds = layer => {
  return clustersFolds_(layer)
    .then(() => aggregateFolds_(layer));
};

module.exports = {createFolds};

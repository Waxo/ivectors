/* eslint-disable max-nested-callbacks */
require('chai').should();
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const rewire = require('rewire');
const {
  firstLayer,
  layersRootPath, inputPath
} = require('../../../config/environment');

const tenFoldPreparerModule = rewire('../../../app/utils/ten-fold-preparer');

const clustersFolds_ = tenFoldPreparerModule.__get__('clustersFolds_');
const aggregateFolds_ = tenFoldPreparerModule.__get__('aggregateFolds_');
const createFolds = tenFoldPreparerModule.__get__('createFolds');

describe('app/utils/ten-fold-preparer.js', () => {
  beforeEach(() => {
    return fs.removeAsync(layersRootPath);
  });

  describe('#clusterFolds_', () => {
    let countClustersFiles = 0;
    let countFilesInput = 0;
    it('should create cluster folds', () => {
      return clustersFolds_(firstLayer)
        .then(() => fs.readdirAsync(`${firstLayer.paths.input}/f0`))
        .then(dirs => {
          dirs.should.be.deep.equal(firstLayer.clusters);
          return BluebirdPromise.map(dirs,
            dir => fs.readdirAsync(`${inputPath}/${dir}`));
        })
        .then(filesInDirs => {
          countClustersFiles =
            filesInDirs.map(a => a.length).reduce((a, b) => a + b);
          return BluebirdPromise.map(firstLayer.clusters,
            cluster => fs.readdirAsync(
              `${firstLayer.paths.input}/f0/${cluster}`));
        })
        .then(filesInput => {
          countFilesInput =
            filesInput.map(a => a.length).reduce((a, b) => a + b);
          return fs.readdirAsync(`${firstLayer.paths.test}/f0`);
        })
        .then(files => {
          (countFilesInput + files.length).should.be.equal(countClustersFiles);
        });
    });
  });

  describe('#aggregateFolds_', () => {
    let countClustersFiles = 0;
    const aggregateName = firstLayer.aggregateClusters[0][0];

    it('should create cluster folds', () => {
      return aggregateFolds_(firstLayer)
        .then(() => fs.readdirAsync(`${firstLayer.paths.input}/f0`))
        .then(dirs => {
          dirs[0].should.be.deep.equal(aggregateName);
          return BluebirdPromise.map(firstLayer.aggregateClusters[0][1],
            cluster => fs.readdirAsync(
              `${inputPath}/${cluster}`));
        })
        .then(filesInDirs => {
          countClustersFiles =
            filesInDirs.map(a => a.length).reduce((a, b) => a + b);
          return BluebirdPromise.all([
            fs.readdirAsync(
              `${firstLayer.paths.input}/f0/${aggregateName}`),
            fs.readdirAsync(`${firstLayer.paths.test}/f0`)
          ]);
        })
        .then(files => {
          const countFiles = files.map(a => a.length).reduce((a, b) => a + b);
          countFiles.should.be.equal(countClustersFiles);
        });
    });
  });

  describe('#createFolds', () => {
    const layer = firstLayer;
    let totalFiles = 0;
    let countFilesInput = 0;
    before(() => {
      const clusters = new Array(...layer.clusters);
      layer.aggregateClusters.forEach(
        aggregate => clusters.push(...aggregate[1]));
      return BluebirdPromise.map(clusters,
        cluster => fs.readdirAsync(`${inputPath}/${cluster}`))
        .then(files => {
          totalFiles = files.map(a => a.length).reduce((a, b) => a + b);
        });
    });

    it('should create folds', function () {
      this.timeout(0);
      return createFolds(layer)
        .then(() => fs.readdirAsync(`${layer.paths.input}/f0`))
        .then(dirs => BluebirdPromise.map(dirs,
          dir => fs.readdirAsync(`${layer.paths.input}/f0/${dir}`)))
        .then(files => {
          countFilesInput = files.map(a => a.length).reduce((a, b) => a + b);
          return fs.readdirAsync(`${layer.paths.test}/f0`);
        })
        .then(files => {
          const countFiles = files.length + countFilesInput;
          countFiles.should.be.equal(totalFiles);
        });
    });
  });
});

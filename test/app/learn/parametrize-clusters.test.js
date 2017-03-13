/* eslint-disable max-nested-callbacks */
require('chai').should();
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const {
  retrieveFiles,
  parametrizeClusters
} = require('../../../app/learn/parametrize-clusters');
const {
  inputPath,
  firstLayer,
  secondLayers
} = require('../../../config/environment');

const humanLayer = secondLayers[0];

describe('app/learn/parametrize-clusters.js', () => {
  describe('#retrieveFiles', () => {
    let countInputFilesLayer1 = 0;
    before(() => {
      return fs.readdirAsync(inputPath)
        .then(dirs => BluebirdPromise.map(dirs,
          dir => fs.readdirAsync(`${inputPath}/${dir}`)))
        .then(read => {
          countInputFilesLayer1 =
            read.map(a => a.length).reduce((a, b) => a + b);
        });
    });

    it('should have the same input files count', () => {
      return retrieveFiles(firstLayer)
        .then(files => files.length.should.be.equal(countInputFilesLayer1));
    });
  });

  describe('#parametrizeClusters', () => {
    const inputFilesLayer1 = [];
    const inputFilesLayer2 = [];
    before(() => {
      return fs.removeAsync(firstLayer.paths.prm)
        .then(() => fs.removeAsync(humanLayer.paths.prm))
        .then(() => retrieveFiles(firstLayer))
        .then(files => {
          inputFilesLayer1.push(...files);
        })
        .then(() => retrieveFiles(humanLayer))
        .then(files => {
          inputFilesLayer2.push(...files);
        });
    });

    it('should have have the same count of prm as input files',
      function () {
        this.timeout(0);
        return parametrizeClusters(inputFilesLayer1, firstLayer)
          .then(() => fs.readdirAsync(firstLayer.paths.prm))
          .then(files => files.length.should.be.equal(inputFilesLayer1.length));
      });

    it('should have have the same count of prm as input files',
      function () {
        this.timeout(0);
        return parametrizeClusters(inputFilesLayer2, humanLayer)
          .then(() => fs.readdirAsync(humanLayer.paths.prm))
          .then(files => files.length.should.be.equal(inputFilesLayer2.length));
      });
  });
});

/* eslint-disable max-nested-callbacks */
require('chai').should();
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const {
  retrieveFiles,
  parametrizeClusters
} = require('../../../app/learn/parametrize-clusters');
const env = require('../../../config/environment');

describe.skip('app/learn/parametrize-clusters.js', () => {
  describe('#retrieveFiles', () => {
    let countInputFilesLayer1 = 0;
    before(() => {
      return fs.readdirAsync(env.inputPath)
        .then(dirs => BluebirdPromise.map(dirs,
          dir => fs.readdirAsync(`${env.inputPath}/${dir}`)))
        .then(read => {
          countInputFilesLayer1 =
            read.map(a => a.length).reduce((a, b) => a + b);
        });
    });

    it('should have the same input files count', () => {
      return retrieveFiles(env.firstLayer)
        .then(files => files.length.should.be.equal(countInputFilesLayer1));
    });
  });

  describe('#parametrizeClusters', () => {
    const inputFilesLayer1 = [];
    const inputFilesLayer2 = [];
    before(() => {
      return fs.removeAsync(env.firstLayer.paths.prm)
        .then(() => fs.removeAsync(env.secondLayers[0].paths.prm))
        .then(() => retrieveFiles(env.firstLayer))
        .then(files => {
          inputFilesLayer1.push(...files);
        })
        .then(() => retrieveFiles(env.secondLayers[0]))
        .then(files => {
          inputFilesLayer2.push(...files);
        });
    });

    after(() => {
      return fs.removeAsync(env.firstLayer.paths.prm)
        .then(() => fs.removeAsync(env.secondLayers[0].paths.prm));
    });

    it('should have have the same count of prm as input files',
      function () {
        this.timeout(0);
        return parametrizeClusters(inputFilesLayer1, env.firstLayer)
          .then(() => fs.readdirAsync(env.firstLayer.paths.prm))
          .then(files => files.length.should.be.equal(inputFilesLayer1.length));
      });

    it('should have have the same count of prm as input files',
      function () {
        this.timeout(0);
        return parametrizeClusters(inputFilesLayer2, env.secondLayers[0])
          .then(() => fs.readdirAsync(env.secondLayers[0].paths.prm))
          .then(files => files.length.should.be.equal(inputFilesLayer2.length));
      });
  });
});

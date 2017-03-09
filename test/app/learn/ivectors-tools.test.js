/* eslint-disable max-nested-callbacks */
require('chai').should();
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const {firstLayer, workbenchCreator} = require('../../../config/environment');
const {
  normPRM,
  createUBM,
  createTV,
  ivExtractor,
  normalizePLDA
} = require('../../../app/learn/ivectors-tools');

describe.only('app/learn/ivectors-tools.js', () => {
  describe('#normPRM', () => {
    it('should normalize prm files', function () {
      this.timeout(0);
      return normPRM(firstLayer)
        .then(() => fs.readdirAsync(firstLayer.paths.prm))
        .then(files => {
          const prm = files.filter(f => !f.match(/\.norm/g));
          const normPrm = files.filter(f => f.match(/\.norm/g));

          normPrm.length.should.be.equal(prm.length);
          normPrm.map(file => file.split('.')[0]).should.be.deep
            .equal(prm.map(file => file.split('.')[0]));
        });
    });
  });

  describe('#createUBM', () => {
    const workbench = workbenchCreator(firstLayer, 1);
    before(function () {
      this.timeout(0);
      return fs.removeAsync(workbench.gmm)
        .then(() => createUBM(firstLayer, workbench))
        .catch(() => {});
    });

    it('should have created files world.gmm and worldinit.gmm', () => {
      return fs.readdirAsync(workbench.gmm)
        .then(files => {
          files.length.should.be.equal(2);
          files.should.be.deep.equal(['world.gmm', 'worldinit.gmm']);
        });
    });
  });

  describe('#createTV', () => {
    const workbench = workbenchCreator(firstLayer, 1);
    before(function () {
      this.timeout(0);
      return fs.removeAsync(workbench.mat)
        .then(() => createTV(firstLayer, workbench))
        .catch(() => {});
    });

    it('should have created TV.matx and other files', () => {
      return fs.readdirAsync(workbench.mat)
        .then(files => {
          files.should.include('TV.matx');
          files.should.include('TV_F_X.matx');
          files.should.include('TV_init.matx');
          files.should.include('TV_N.matx');
          files.should.include('newMeanMinDiv_it.matx');
        });
    });
  });

  describe('#ivExtractor', () => {
    const workbench = workbenchCreator(firstLayer, 1);
    const inputFiles = [];
    const inputClusters = [];

    before(() => {
      return fs.removeAsync(workbench.ivRaw)
        .then(() => fs.readdirAsync(`${firstLayer.paths.input}/f1`))
        .then(clusters => {
          inputClusters.push(...clusters);
          return BluebirdPromise.all([
            BluebirdPromise.map(clusters, cluster => fs.readdirAsync(
              `${firstLayer.paths.input}/f1/${cluster}`)),
            fs.readdirAsync(`${firstLayer.paths.test}/f1`)
          ]);
        })
        .then(([inputFilesList, testFilesList]) => {
          inputFilesList.forEach(list => {
            inputFiles.push(...list.map(file => file.replace('.wav', '')));
          });
          inputFiles.push(
            ...testFilesList.map(file => file.replace('.wav', '')));
          inputFiles.sort();
        });
    });

    it('should extract all single ivectors', function () {
      this.timeout(0);
      return ivExtractor(firstLayer, workbench, 'ivExtractorAll.ndx')
        .then(() => fs.readdirAsync(workbench.ivRaw))
        .then(ivRaw => {
          ivRaw.length.should.be.equal(inputFiles.length);
          ivRaw.map(iv => iv.replace('.y', '')).should.be.deep
            .equal(inputFiles);
        });
    });

    it('should extract concatenated vectors', function () {
      this.timeout(0);
      return ivExtractor(firstLayer, workbench, 'ivExtractor.ndx')
        .then(() => fs.readdirAsync(workbench.ivRaw))
        .then(ivRaw => {
          ivRaw.length.should.be.equal(
            inputFiles.length + inputClusters.length);
          ivRaw.map(iv => iv.replace('.y', '')).should.include
            .members(inputClusters);
        });
    });
  });

  describe.only('#normalizePLDA', () => {
    const workbench = workbenchCreator(firstLayer, 1);

    before(() => {
      return fs.removeAsync(workbench.ivLenNorm);
    });

    it('should have the same number of files than ivectors', function () {
      this.timeout(0);
      return normalizePLDA(firstLayer, workbench)
        .then(() => BluebirdPromise.all([
          fs.readdirAsync(workbench.ivLenNorm),
          fs.readdirAsync(workbench.ivRaw)
        ]))
        .then(([norm, raw]) => {
          norm.length.should.be.equal(raw.length);
          norm.should.be.deep.equal(raw);
          return fs.readdirAsync(workbench.mat);
        })
        .then(filesList => {
          filesList.should.include('EfrMat0.matx');
          filesList.should.include('EfrMean0.matx');
        });
    });
  });
});

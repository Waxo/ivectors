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
  normalizePLDA,
  createSph,
  trainPLDA,
  scoreSph,
  scorePLDA
} = require('../../../app/learn/ivectors-tools');

describe.only('app/learn/ivectors-tools.js', () => {
  const workbench = workbenchCreator(firstLayer, 1);

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

  describe('#normalizePLDA', () => {
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

  describe('#createSph', () => {
    it('should create the appropriates matrices for sph scoring', () => {
      return createSph(firstLayer, workbench)
        .then(() => fs.readdirAsync(workbench.mat))
        .then(filesList => {
          filesList.should.include.members([
            'plda_SphNorm_G.matx',
            'plda_SphNorm_minDivMean.matx',
            'plda_SphNorm_originalMean.matx',
            'plda_SphNorm_Sigma.matx',
            'sphNorm_SphNormMat0.matx',
            'sphNorm_SphNormMat1.matx',
            'sphNorm_SphNormMean0.matx',
            'sphNorm_SphNormMean1.matx'
          ]);
        });
    });
  });

  describe('#trainPLDA', () => {
    it('should create the appropriates matrices for PLDA scoring', () => {
      return trainPLDA(firstLayer, workbench)
        .then(() => fs.readdirAsync(workbench.mat))
        .then(filesList => {
          filesList.should.include.members([
            'plda_F.matx',
            'plda_G.matx',
            'plda_minDivMean.matx',
            'plda_originalMean.matx',
            'plda_Sigma.matx'
          ]);
        });
    });
  });

  describe.only('#scoreSph', () => {
    it('should score all test files', () => {
      return scoreSph(workbench)
        .then(() => fs.readdirAsync(workbench.scores.sph))
        .then(filesList => {
          filesList.should.include('1.txt');
          return BluebirdPromise.all([
            fs.readFileAsync(`${workbench.scores.sph}/1.txt`),
            fs.readdirAsync(`${firstLayer.paths.input}/f1`),
            fs.readdirAsync(`${firstLayer.paths.test}/f1`)
          ]);
        })
        .then(([results, inputClusters, testFiles]) => {
          results.toString().split('\n').filter(line => line !== '').length
            .should.be.equal(inputClusters.length * testFiles.length);
        });
    });
  });

  describe.only('#scorePLDA', () => {
    it('should score all test files', () => {
      return scorePLDA(workbench)
        .then(() => fs.readdirAsync(workbench.scores.plda))
        .then(filesList => {
          filesList.should.include('1.txt');
          return BluebirdPromise.all([
            fs.readFileAsync(`${workbench.scores.plda}/1.txt`),
            fs.readdirAsync(`${firstLayer.paths.input}/f1`),
            fs.readdirAsync(`${firstLayer.paths.test}/f1`)
          ]);
        })
        .then(([results, inputClusters, testFiles]) => {
          results.toString().split('\n').filter(line => line !== '').length
            .should.be.equal(inputClusters.length * testFiles.length);
        });
    });
  });
});

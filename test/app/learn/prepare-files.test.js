/* eslint-disable max-nested-callbacks */
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const env = require('../../../config/environment');
const {
  writeDataLST,
  writeTvNDX,
  writeIvExtractorNDX,
  writeIvExtractorMatNDX,
  writeTrainModelNDX,
  writeIvTestNDX,
  writeCreateIvTestMatNDX,
  writePldaNDX
} = require('../../../app/learn/prepare-files');
require('chai').should();

describe.only('app/learn/prepare-files.js', () => {
  describe('#writeDataLST', () => {
    let numberOfFiles = 0;

    before(() => {
      const foldRead = `${env.firstLayer.paths.input}/f0`;
      return fs.readdirAsync(foldRead)
        .then(dirs => BluebirdPromise.map(dirs,
          dir => fs.readdirAsync(`${foldRead}/${dir}`)))
        .then(lists => {
          numberOfFiles = lists.map(l => l.length).reduce((a, b) => a + b);
        });
    });

    it('should have the same number of lines as input files', () => {
      return writeDataLST(env.firstLayer)
        .then(
          () => fs.readFileAsync(`${env.firstLayer.paths.files}/f0/data.lst`))
        .then(read => {
          const numberLines = read.toString().split('\n')
            .filter(line => line !== '').length;
          numberLines.should.be.equal(numberOfFiles);
        });
    });
  });

  describe('#writeTvNDX', () => {
    it('should have the same content as data.lst', () => {
      return writeTvNDX(env.firstLayer)
        .then(() => BluebirdPromise.all([
          fs.readFileAsync(`${env.firstLayer.paths.files}/f0/data.lst`),
          fs.readFileAsync(`${env.firstLayer.paths.files}/f0/tv.ndx`)
        ]))
        .then(([data, tv]) => {
          data.toString().should.be.equal(tv.toString());
        });
    });
  });

  describe('#writeIvExtractorNDX', () => {
    before(() => writeIvExtractorNDX(env.firstLayer));

    it('should have the same number of clusters', () => {
      return BluebirdPromise.all([
        fs.readFileAsync(`${env.firstLayer.paths.files}/f0/ivExtractor.ndx`),
        fs.readdirAsync(`${env.firstLayer.paths.input}/f0`)
      ])
        .then(([ivExtractor, dir]) => {
          ivExtractor.toString().split('\n').length.should.be.equal(dir.length);
        });
    });

    it('should not have the .wav in ivExtractor.ndx', () => {
      return fs.readFileAsync(
        `${env.firstLayer.paths.files}/f0/ivExtractor.ndx`)
        .then(read => {
          read.toString().should.not.have.string('.wav');
        });
    });
  });

  describe('#writeIvExtractorMatNDX', () => {
    let numberOfFiles = 0;

    before(() => {
      const foldRead = `${env.firstLayer.paths.input}/f0`;
      return fs.readdirAsync(foldRead)
        .then(dirs => BluebirdPromise.map(dirs,
          dir => fs.readdirAsync(`${foldRead}/${dir}`)))
        .then(lists => {
          numberOfFiles = lists.map(l => l.length).reduce((a, b) => a + b);
          return writeIvExtractorMatNDX(env.firstLayer);
        });
    });

    it('should have the same number of files', () => {
      return fs.readFileAsync(
        `${env.firstLayer.paths.files}/f0/ivExtractorMat.ndx`)
        .then(ivExtractorMat => {
          ivExtractorMat.toString().split('\n').length.should.be
            .equal(numberOfFiles);
        });
    });

    it('should not have the .wav in ivExtractorMat.ndx', () => {
      return fs.readFileAsync(
        `${env.firstLayer.paths.files}/f0/ivExtractorMat.ndx`)
        .then(read => {
          read.toString().should.not.have.string('.wav');
        });
    });
  });

  describe('#writeTrainModelNDX', () => {
    before(() => BluebirdPromise.all([
      writeIvExtractorNDX(env.firstLayer),
      writeIvExtractorMatNDX(env.firstLayer)
    ]));

    it('should have the content of ivExtractorMat.ndx and ivExtractor.ndx',
      () => {
        return writeTrainModelNDX(env.firstLayer)
          .then(() => BluebirdPromise.all([
            fs.readFileAsync(`${env.firstLayer.paths.files}/f0/TrainModel.ndx`),
            fs.readFileAsync(
              `${env.firstLayer.paths.files}/f0/ivExtractor.ndx`),
            fs.readFileAsync(
              `${env.firstLayer.paths.files}/f0/ivExtractorMat.ndx`)
          ]))
          .then(([trainModel, ivExtractor, ivExtractorMat]) => {
            trainModel.toString().should.have.string(ivExtractor.toString());
            trainModel.toString().should.have.string(ivExtractorMat.toString());
          });
      });
  });

  describe('#writeIvTestNDX', () => {
    before(() => writeIvTestNDX(env.firstLayer));

    it('should have the same number as input clusters', () => {
      return BluebirdPromise.all([
        fs.readFileAsync(`${env.firstLayer.paths.files}/f0/ivTest.ndx`),
        fs.readdirAsync(`${env.firstLayer.paths.input}/f0`)
      ])
        .then(([fileRead, inputDirs]) => {
          fileRead.toString().split(' ').length.should.be
            .equal(inputDirs.length + 1);
        });
    });
  });

  describe('#writeCreateIvTestMatNDX', () => {
    let countFiles = 0;
    before(() => {
      return writeCreateIvTestMatNDX(env.firstLayer)
        .then(() => fs.readdirAsync(`${env.firstLayer.paths.input}/f0`))
        .then(dirs => BluebirdPromise.map(dirs,
          dir => fs.readdirAsync(`${env.firstLayer.paths.input}/f0/${dir}`)))
        .then(filesLists => {
          countFiles =
            filesLists.map(filesList => filesList.length)
              .reduce((a, b) => a + b);
        });
    });

    it('should have the same number as input clusters', () => {
      return fs.readFileAsync(`${env.firstLayer.paths.files}/f0/ivTestMat.ndx`)
        .then(fileRead => {
          fileRead.toString().split(' ').length.should.be
            .equal(countFiles + 1);
        });
    });

    it('should not have the .wav in ivTestMat.ndx', () => {
      return fs.readFileAsync(
        `${env.firstLayer.paths.files}/f0/ivTestMat.ndx`)
        .then(read => {
          read.toString().should.not.have.string('.wav');
        });
    });

    it('should have the same value in pos 0 and 1 in ivTestMat.ndx', () => {
      return fs.readFileAsync(
        `${env.firstLayer.paths.files}/f0/ivTestMat.ndx`)
        .then(read => {
          const [comparedSound, firstTest] = read.toString().split(' ');
          comparedSound.should.be.equal(firstTest);
        });
    });
  });

  describe('#writePldaNDX', () => {
    before(() => writePldaNDX(env.firstLayer));

    it('should have same lengths as input files', () => {
      return fs.readdirAsync(`${env.firstLayer.paths.input}/f0`)
        .then(dirs => BluebirdPromise.all([
          fs.readFileAsync(`${env.firstLayer.paths.files}/f0/Plda.ndx`),
          BluebirdPromise.map(dirs,
            dir => fs.readdirAsync(`${env.firstLayer.paths.input}/f0/${dir}`))
        ]))
        .then(([fileRead, filesLists]) => {
          fileRead.toString().split('\n').map(line => line.split(' ').length)
            .should.be.deep.equal(filesLists.map(list => list.length));
        });
    });

    it('should not have the .wav in Plda.ndx', () => {
      return fs.readFileAsync(
        `${env.firstLayer.paths.files}/f0/Plda.ndx`)
        .then(read => {
          read.toString().should.not.have.string('.wav');
        });
    });
  });
});

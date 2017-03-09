/* eslint-disable max-nested-callbacks */
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const {firstLayer} = require('../../../config/environment');
const {
  writeDataLST,
  writeTvNDX,
  writeIvExtractorNDX,
  writeIvExtractorMatNDX,
  writeTrainModelNDX,
  writeIvTestNDX,
  writeCreateIvTestMatNDX,
  writePldaNDX,
  writeAllLST,
  writeIvExtractorAllNDX,
  linkIvExtractorAllNDX
} = require('../../../app/learn/prepare-files');
require('chai').should();

describe('app/learn/prepare-files.js', () => {
  describe('#writeDataLST', () => {
    let numberOfFiles = 0;

    before(() => {
      const foldRead = `${firstLayer.paths.input}/f0`;
      return fs.readdirAsync(foldRead)
        .then(dirs => BluebirdPromise.map(dirs,
          dir => fs.readdirAsync(`${foldRead}/${dir}`)))
        .then(lists => {
          numberOfFiles = lists.map(l => l.length).reduce((a, b) => a + b);
        });
    });

    it('should have the same number of lines as input files', () => {
      return writeDataLST(firstLayer)
        .then(
          () => fs.readFileAsync(`${firstLayer.paths.files}/f0/data.lst`))
        .then(read => {
          const numberLines = read.toString().split('\n')
            .filter(line => line !== '').length;
          numberLines.should.be.equal(numberOfFiles);
        });
    });
  });

  describe('#writeTvNDX', () => {
    it('should have the same content as data.lst', () => {
      return writeTvNDX(firstLayer)
        .then(() => BluebirdPromise.all([
          fs.readFileAsync(`${firstLayer.paths.files}/f0/data.lst`),
          fs.readFileAsync(`${firstLayer.paths.files}/f0/tv.ndx`)
        ]))
        .then(([data, tv]) => {
          data.toString().should.be.equal(tv.toString());
        });
    });
  });

  describe('#writeIvExtractorNDX', () => {
    before(() => writeIvExtractorNDX(firstLayer));

    it('should have the same number of clusters', () => {
      return BluebirdPromise.all([
        fs.readFileAsync(`${firstLayer.paths.files}/f0/ivExtractor.ndx`),
        fs.readdirAsync(`${firstLayer.paths.input}/f0`)
      ])
        .then(([ivExtractor, dir]) => {
          ivExtractor.toString().split('\n').length.should.be.equal(dir.length);
        });
    });

    it('should not have the .wav in ivExtractor.ndx', () => {
      return fs.readFileAsync(
        `${firstLayer.paths.files}/f0/ivExtractor.ndx`)
        .then(read => {
          read.toString().should.not.have.string('.wav');
        });
    });
  });

  describe('#writeIvExtractorMatNDX', () => {
    let numberOfFiles = 0;

    before(() => {
      const foldRead = `${firstLayer.paths.input}/f0`;
      return fs.readdirAsync(foldRead)
        .then(dirs => BluebirdPromise.map(dirs,
          dir => fs.readdirAsync(`${foldRead}/${dir}`)))
        .then(lists => {
          numberOfFiles = lists.map(l => l.length).reduce((a, b) => a + b);
          return writeIvExtractorMatNDX(firstLayer);
        });
    });

    it('should have the same number of files', () => {
      return fs.readFileAsync(
        `${firstLayer.paths.files}/f0/ivExtractorMat.ndx`)
        .then(ivExtractorMat => {
          ivExtractorMat.toString().split('\n').length.should.be
            .equal(numberOfFiles);
        });
    });

    it('should not have the .wav in ivExtractorMat.ndx', () => {
      return fs.readFileAsync(
        `${firstLayer.paths.files}/f0/ivExtractorMat.ndx`)
        .then(read => {
          read.toString().should.not.have.string('.wav');
        });
    });
  });

  describe('#writeTrainModelNDX', () => {
    before(() => BluebirdPromise.all([
      writeIvExtractorNDX(firstLayer),
      writeIvExtractorMatNDX(firstLayer)
    ]));

    it('should have the content of ivExtractorMat.ndx and ivExtractor.ndx',
      () => {
        return writeTrainModelNDX(firstLayer)
          .then(() => BluebirdPromise.all([
            fs.readFileAsync(`${firstLayer.paths.files}/f0/TrainModel.ndx`),
            fs.readFileAsync(`${firstLayer.paths.files}/f0/ivExtractor.ndx`),
            fs.readFileAsync(`${firstLayer.paths.files}/f0/ivExtractorMat.ndx`)
          ]))
          .then(([trainModel, ivExtractor, ivExtractorMat]) => {
            trainModel = trainModel.toString();
            ivExtractor = ivExtractor.toString();
            ivExtractorMat = ivExtractorMat.toString();
            trainModel.should.have.string(ivExtractor);
            trainModel.should.have.string(ivExtractorMat);
            trainModel.split('\n').length.should.be.equal(
              ivExtractorMat.split('\n').length +
              ivExtractor.split('\n').length);
          });
      });
  });

  describe('#writeIvTestNDX', () => {
    before(() => writeIvTestNDX(firstLayer));

    it('should have the same number as input clusters', () => {
      return BluebirdPromise.all([
        fs.readFileAsync(`${firstLayer.paths.files}/f0/ivTest.ndx`),
        fs.readdirAsync(`${firstLayer.paths.input}/f0`)
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
      return writeCreateIvTestMatNDX(firstLayer)
        .then(() => fs.readdirAsync(`${firstLayer.paths.input}/f0`))
        .then(dirs => BluebirdPromise.map(dirs,
          dir => fs.readdirAsync(`${firstLayer.paths.input}/f0/${dir}`)))
        .then(filesLists => {
          countFiles =
            filesLists.map(filesList => filesList.length)
              .reduce((a, b) => a + b);
        });
    });

    it('should have the same number as input clusters', () => {
      return fs.readFileAsync(`${firstLayer.paths.files}/f0/ivTestMat.ndx`)
        .then(fileRead => {
          fileRead.toString().split(' ').length.should.be
            .equal(countFiles + 1);
        });
    });

    it('should not have the .wav in ivTestMat.ndx', () => {
      return fs.readFileAsync(
        `${firstLayer.paths.files}/f0/ivTestMat.ndx`)
        .then(read => {
          read.toString().should.not.have.string('.wav');
        });
    });

    it('should have the same value in pos 0 and 1 in ivTestMat.ndx', () => {
      return fs.readFileAsync(
        `${firstLayer.paths.files}/f0/ivTestMat.ndx`)
        .then(read => {
          const [comparedSound, firstTest] = read.toString().split(' ');
          comparedSound.should.be.equal(firstTest);
        });
    });
  });

  describe('#writePldaNDX', () => {
    before(() => writePldaNDX(firstLayer));

    it('should have same lengths as input files', () => {
      return fs.readdirAsync(`${firstLayer.paths.input}/f0`)
        .then(dirs => BluebirdPromise.all([
          fs.readFileAsync(`${firstLayer.paths.files}/f0/Plda.ndx`),
          BluebirdPromise.map(dirs,
            dir => fs.readdirAsync(`${firstLayer.paths.input}/f0/${dir}`))
        ]))
        .then(([fileRead, filesLists]) => {
          fileRead.toString().split('\n').map(line => line.split(' ').length)
            .should.be.deep.equal(filesLists.map(list => list.length));
        });
    });

    it('should not have the .wav in Plda.ndx', () => {
      return fs.readFileAsync(
        `${firstLayer.paths.files}/f0/Plda.ndx`)
        .then(read => {
          read.toString().should.not.have.string('.wav');
        });
    });
  });

  describe('#writeAllLST', () => {
    before(() => writeAllLST(firstLayer));

    it('should have the same number of files as input', () => {
      const clusters = [];
      return fs.readdirAsync(`${firstLayer.paths.input}/f0`)
        .then(dirs => {
          clusters.push(...dirs);
          return BluebirdPromise.all([
            fs.readFileAsync(`${firstLayer.paths.lRoot}/all.lst`),
            BluebirdPromise.map(dirs,
              dir => fs.readdirAsync(`${firstLayer.paths.input}/f0/${dir}`)),
            fs.readdirAsync(`${firstLayer.paths.test}/f0`)
          ]);
        })
        .then(([fileRead, inputList, testList]) => {
          const lines = fileRead.toString().split('\n');
          const plainInputList = [];
          inputList.forEach(list => {
            plainInputList.push(...list.map(file => file.replace('.wav', '')));
          });
          const countFile = plainInputList.length + testList.length +
            clusters.length;
          lines.should.include.members(plainInputList);
          lines.should.include.members(
            testList.map(file => file.replace('.wav', '')));
          lines.should.include.members(clusters);
          lines.length.should.be.equal(countFile);
        });
    });

    it('should not have the .prm in all.lst', () => {
      return fs.readFileAsync(
        `${firstLayer.paths.lRoot}/all.lst`)
        .then(read => {
          read.toString().should.not.have.string('.prm');
        });
    });

    it('should not have the .norm.prm in all.lst', () => {
      return fs.readFileAsync(
        `${firstLayer.paths.lRoot}/all.lst`)
        .then(read => {
          read.toString().should.not.have.string('.norm');
        });
    });
  });

  describe('#ivExtractorAllNDX', () => {
    let countInputFiles = 0;
    before(() => fs.readdirAsync(`${firstLayer.paths.input}/f0`)
      .then(inputDir => {
        return BluebirdPromise.all([
          BluebirdPromise.map(inputDir,
            dir => fs.readdirAsync(`${firstLayer.paths.input}/f0/${dir}`)),
          fs.readdirAsync(`${firstLayer.paths.test}/f0`)
        ]);
      })
      .then(([inputList, testList]) => {
        countInputFiles =
          inputList.map(list => list.length).reduce((a, b) => a + b) +
          testList.length;
      })
    );

    it('should have the same length as total files', () => {
      return writeIvExtractorAllNDX(firstLayer)
        .then(() => fs.readFileAsync(
          `${firstLayer.paths.lRoot}/ivExtractorAll.ndx`))
        .then(ivExtractorAll => {
          ivExtractorAll.toString().split('\n').length.should.be
            .equal(countInputFiles);
        });
    });
  });

  describe('#linkIvExtractorAllNDX', () => {
    it('should exist in layer', () => {
      return linkIvExtractorAllNDX(firstLayer)
        .then(() => fs.readdirAsync(`${firstLayer.paths.files}/f0`))
        .then(files => files.should.include('ivExtractorAll.ndx'));
    });
  });
});

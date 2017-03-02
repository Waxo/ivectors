require('chai').should();
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const {
  parametrizeSound
} = require('../../../app/learn/parametrize-sound');
const execAsync = require('../../../app/utils/exec-async');
const {
  firstLayer,
  secondLayers,
  inputPath
} = require('../../../config/environment');

const humanLayer = secondLayers[0];

describe('app/learn/parametrize-sound.js', () => {
  describe('#parametrizeSound', () => {
    let fileToRead =
      `${inputPath}/${firstLayer.aggregateClusters[0][1][1]}`;
    let fileName = '';
    before(() => {
      return fs.readdirAsync(fileToRead)
        .then(files => {
          fileName = files[0].replace('.wav', '');
          fileToRead += `/${files[0]}`;
        });
    });

    beforeEach(() => {
      return BluebirdPromise.all([
        fs.removeAsync(firstLayer.paths.prm),
        fs.removeAsync(firstLayer.paths.lbl),
        fs.removeAsync(humanLayer.paths.prm),
        fs.removeAsync(humanLayer.paths.lbl)
      ])
        .catch(() => {});
    });

    it('should parametrize the given sound without RER', () => {
      return parametrizeSound(fileToRead, firstLayer)
        .then(() => BluebirdPromise.all(
          [
            fs.readdirAsync(firstLayer.paths.prm),
            fs.readdirAsync(firstLayer.paths.lbl)
          ]))
        .then(([prmFiles, lblFiles]) => {
          prmFiles.length.should.be.equal(1);
          lblFiles.length.should.be.equal(1);
          prmFiles[0].should.have.string(fileName);
          lblFiles[0].should.have.string(fileName);
          const vectorSize = (firstLayer.mfccSize + 3 +
            ((firstLayer.useRER) ? 1 : 0)) * 3;
          return BluebirdPromise.all([
            execAsync([
              `${process.cwd()}/bin-test/ReadFeatFile`,
              `--featureFilesPath ${firstLayer.paths.prm}/`,
              '--loadFeatureFileExtension .prm',
              '--loadFeatureFileFormat RAW',
              `--inputFeatureFileName ${fileName}`,
              `--loadFeatureFileVectSize ${vectorSize}`,
              '--featureFlags 100000'
            ].join(' ')),
            execAsync([
              `${process.cwd()}/bin-test/ReadFeatFile`,
              `--featureFilesPath ${firstLayer.paths.prm}/`,
              '--loadFeatureFileExtension .prm',
              '--loadFeatureFileFormat RAW',
              `--inputFeatureFileName ${fileName}`,
              `--loadFeatureFileVectSize ${vectorSize + 1}`,
              '--featureFlags 100000'
            ].join(' '))
          ]);
        })
        .then(([success, failed]) => {
          success.should.not.have.string('Wrong number of data');
          failed.should.have.string('Wrong number of data');
        });
    });

    it('should parametrize the given sound with RER', () => {
      return parametrizeSound(fileToRead, humanLayer)
        .then(() => BluebirdPromise.all(
          [
            fs.readdirAsync(humanLayer.paths.prm),
            fs.readdirAsync(humanLayer.paths.lbl)
          ]))
        .then(([prmFiles, lblFiles]) => {
          prmFiles.length.should.be.equal(1);
          lblFiles.length.should.be.equal(1);
          prmFiles[0].should.have.string(fileName);
          lblFiles[0].should.have.string(fileName);
          const vectorSize = (humanLayer.mfccSize + 3 +
            ((humanLayer.useRER) ? 1 : 0)) * 3;
          return BluebirdPromise.all([
            execAsync([
              `${process.cwd()}/bin-test/ReadFeatFile`,
              `--featureFilesPath ${humanLayer.paths.prm}/`,
              '--loadFeatureFileExtension .prm',
              '--loadFeatureFileFormat RAW',
              `--inputFeatureFileName ${fileName}`,
              `--loadFeatureFileVectSize ${vectorSize}`,
              '--featureFlags 100000'
            ].join(' ')),
            execAsync([
              `${process.cwd()}/bin-test/ReadFeatFile`,
              `--featureFilesPath ${humanLayer.paths.prm}/`,
              '--loadFeatureFileExtension .prm',
              '--loadFeatureFileFormat RAW',
              `--inputFeatureFileName ${fileName}`,
              `--loadFeatureFileVectSize ${vectorSize + 1}`,
              '--featureFlags 100000'
            ].join(' '))
          ]);
        })
        .then(([success, failed]) => {
          success.should.not.have.string('Wrong number of data');
          failed.should.have.string('Wrong number of data');
        });
    });
  });
});

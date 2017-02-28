require('chai').should();
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const {
  parametrizeSound
} = require('../../../app/learn/parametrize-sound');
const execAsync = require('../../../app/utils/exec-async');

const env = require('../../../config/environment');

describe('app/learn/parametrize-sound.js', () => {
  describe('#parametrizeSound', () => {
    let fileToRead = '';
    let fileName = '';
    before(() => {
      return fs.readdirAsync(env.inputPath)
        .then(dirs => {
          fileToRead = `${env.inputPath}/${dirs[0]}`;
          return fs.readdirAsync(fileToRead);
        })
        .then(files => {
          fileName = files[0].replace('.wav', '');
          fileToRead += `/${files[0]}`
        });
    });

    beforeEach(() => {
      return fs.removeAsync(env.firstLayer.prm)
        .catch(err => {});
    });

    it('should parametrize the given sound', () => {
      return parametrizeSound(fileToRead, env.firstLayer)
        .then(() => BluebirdPromise.all(
          [
            fs.readdirAsync(env.firstLayer.paths.prm),
            fs.readdirAsync(env.firstLayer.paths.lbl)
          ]))
        .then(([prmFiles, lblFiles]) => {
          prmFiles.length.should.be.equal(1);
          lblFiles.length.should.be.equal(1);
          prmFiles[0].should.have.string(fileName);
          lblFiles[0].should.have.string(fileName);
          const vectorSize = (env.firstLayer.mfccSize + 3 +
            ((env.firstLayer.useRER) ? 1 : 0)) * 3;
          return BluebirdPromise.all([
            execAsync([
              `${process.cwd()}/bin-test/ReadFeatFile`,
              `--featureFilesPath ${env.firstLayer.paths.prm}/`,
              '--loadFeatureFileExtension .prm',
              '--loadFeatureFileFormat RAW',
              `--inputFeatureFileName ${fileName}`,
              `--loadFeatureFileVectSize ${vectorSize}`,
              '--featureFlags 100000'
            ].join(' ')),
            execAsync([
              `${process.cwd()}/bin-test/ReadFeatFile`,
              `--featureFilesPath ${env.firstLayer.paths.prm}/`,
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

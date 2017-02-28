require('chai').should();
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const {
  parametrizeClusters
} = require('../../../app/learn/parametrize-clusters');
const env = require('../../../config/environment');

describe.skip('app/learn/parametrize-clusters.js', () => {
  describe('#parametrizeClusters', () => {
    let countInputFiles = 0;
    before(() => {
      return fs.readdirAsync(env.inputPath)
        .then(dirs => BluebirdPromise.map(dirs,
          dir => fs.readdirAsync(`${env.inputPath}/${dir}`)))
        .then(read => {
          countInputFiles = read.map(a => a.length).reduce((a, b) => a + b);
        });
    });

    it('should have the same input files count', () => {
      return fs.readdirAsync(`${env.firstLayer.paths.prm}`)
        .then(files => files.length.should.be.equal(countInputFiles));
    });
  });
});

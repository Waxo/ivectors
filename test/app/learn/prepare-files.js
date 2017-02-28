const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const env = require('../../../config/environment');
const {
  writeDataLST,
  writeTvNDX,
  writeIvExtractorNDX
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
        })
    });

    it('should have the same number of lines as input files', () => {
      return writeDataLST(env.firstLayer)
        .then(
          () => fs.readFileAsync(`${env.firstLayer.paths.files}/f0/data.lst`))
        .then(read => {
          const numberLines = read.toString().split('\n')
            .filter(line => line !== '').length;
          numberLines.should.be.equal(numberOfFiles);
        })
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
    it('should have the same number of clusters', () => {
      return writeIvExtractorNDX(env.firstLayer)
        .then(() => BluebirdPromise.all([
          fs.readFileAsync(`${env.firstLayer.paths.files}/f0/ivExtractor.ndx`),
          fs.readdirAsync(`${env.firstLayer.paths.input}/f0`)
        ]))
        .then(([ivExtractor, dir]) => {
          ivExtractor.toString().split('\n').length.should.be.equal(dir.length);
        });
    });
  });
});

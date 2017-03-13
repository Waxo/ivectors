require('chai').should();
const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const {firstLayer, workbenchCreator} = require('../../../config/environment');
const {
  scoreFold,
  isGoodMatch,
  humanLayerTestList
} = require('../../../app/utils/score-reader');

describe('app/utils/score-reader.js', () => {
  const workbench = workbenchCreator(firstLayer, 1);
  before(() => {
    return scoreFold(workbench);
  });

  describe('#scoreFold', () => {
    it('should return the scores by file', () => {
      return fs.readdirAsync(`${firstLayer.paths.test}/f1`)
        .then(files => {
          workbench.results.size.should.be.equal(files.length);
        });
    });
  });

  describe('#isGoodMatch', () => {
    it('should give the good and bad results', () => {
      const test = {};
      test.results = new Map();
      test.results.set('Breathing-00000', 'Human');
      test.results.set('Breathing-00001', 'GlassBreaking');
      test.results.set('GlassBreaking-00002', 'Human');
      test.results.set('GlassBreaking-00003', 'GlassBreaking');

      isGoodMatch(firstLayer, test);
      test.results.get('Breathing-00000').should.be.deep.equal([true, 'Human']);
      test.results.get('Breathing-00001').should.be.deep
        .equal([false, 'GlassBreaking']);
      test.results.get('GlassBreaking-00002').should.be.deep
        .equal([false, 'Human']);
      test.results.get('GlassBreaking-00003').should.be.deep
        .equal([true, 'GlassBreaking']);
    });
  });

  describe('#humanLayerTestList', () => {
    it('should return the human layer test list', () => {
      const test = {};
      test.results = new Map();
      test.results.set('Breathing-00000', 'Human');
      test.results.set('Breathing-00001', 'GlassBreaking');
      test.results.set('GlassBreaking-00002', 'Human');
      test.results.set('GlassBreaking-00003', 'GlassBreaking');

      isGoodMatch(firstLayer, test);
      humanLayerTestList(test);
      test.goHuman.length.should.be.equal(1);
      test.goHuman.should.be.deep.equal(['Breathing-00000']);
    });
  });
});

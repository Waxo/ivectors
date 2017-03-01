require('chai').should();
const rewire = require('rewire');

const splitterModule = rewire('../../../app/utils/splitter');

const splitter = splitterModule.__get__('splitter');
const getMultiplier = splitterModule.__get__('getMultiplier_');

describe('app/utils/splitter.js', () => {
  describe('#getMultiplier_', () => {
    it('Should return the ceil multiplier', () => {
      getMultiplier(5).should.be.equal(10);
      getMultiplier(32).should.be.equal(100);
      getMultiplier(999).should.be.equal(1000);
      getMultiplier(1049).should.be.equal(10000);
    });
  });

  describe('#splitter', () => {
    const baseArray = [];
    for (let i = 0; i < 10; i++) {
      baseArray.push(i);
    }

    const splittedArray = splitter(baseArray, 2);
    const splittedArray2 = splitter(baseArray, 2);
    const fusedArray = [...splittedArray[0], ...splittedArray[1]];
    const fusedArray2 = [...splittedArray2[0], ...splittedArray2[1]];

    it('Should split array randomly but evenly', () => {
      splittedArray.should.have.lengthOf(2);
      splittedArray[0].should.have.lengthOf(5);
      splittedArray[1].should.have.lengthOf(5);

      splittedArray2.should.have.lengthOf(2);
      splittedArray2[0].should.have.lengthOf(5);
      splittedArray2[1].should.have.lengthOf(5);
    });

    it('Should not have the same arrays', () => {
      splittedArray.should.not.deep.equal(splittedArray2);
      fusedArray.should.not.deep.equal(fusedArray2);
    });

    it('Should retrieve the base array', () => {
      fusedArray.sort().should.deep.equal(baseArray);
      fusedArray2.sort().should.deep.equal(baseArray);
    });
  });
});

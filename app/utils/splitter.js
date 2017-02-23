const logger = require('./logger');

const getMultiplier_ = number => {
  let multiplier = '1';
  multiplier += `${number}`.replace(/[0-9]/g, '0');
  return Number(multiplier);
};

const splitter = (arr, nbSplit) => {
  logger.log('silly', `splitter`);
  const splits = [];
  const arrWork = [...arr];
  const nbElements = arrWork.length;
  const randMultiplier = getMultiplier_(nbElements);

  for (let i = 0; i < nbSplit; i++) {
    splits[i] = [];
  }

  for (let i = 0; i < nbElements; i++) {
    splits[i % nbSplit].push(
      ...arrWork.splice((Math.random() * randMultiplier) % arrWork.length, 1));
  }

  return splits;
};

module.exports = {splitter};

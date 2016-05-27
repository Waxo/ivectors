const computePercent = res => {
  for (const cluster in res) {
    if (res.hasOwnProperty(cluster)) {
      res[cluster].percentMatch = (Math.floor(
          (res[cluster].numberOfMatches / res[cluster].numberOfSamples) *
          10000) / 100) + ' %';
    }
  }
};

const countMean = scores => {
  let res = {};
  for (const ivTest in scores) {
    if (scores.hasOwnProperty(ivTest)) {
      let className = ivTest.split('-')[0];
      if (!res[className]) {
        res[className] = {
          numberOfMatches: 0,
          numberOfSamples: 0
        };
      }
      let sortable = [];
      for (const cluster in scores[ivTest]) {
        if (scores[ivTest].hasOwnProperty(cluster)) {
          sortable.push([cluster,
            scores[ivTest][cluster].scores.reduce((a, b) => a + b) /
            scores[ivTest][cluster].scores.length]);
        }
      }
      sortable.sort((a, b) => b[1] - a[1]);
      if (className === sortable[0][0]) {
        res[className].numberOfMatches++;
      }
      res[className].numberOfSamples++;
    }
  }
  computePercent(res); // ref object
  return res;
};

export {countMean};

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

const countMeanAVG = scores => {
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
      let globNum = [];
      for (const cluster in scores[ivTest]) {
        if (scores[ivTest].hasOwnProperty(cluster)) {
          globNum = globNum.concat(scores[ivTest][cluster].scores);
        }
      }
      const mean = globNum.reduce((a, b) => a + b) / globNum.length;
      let sortable = [];
      for (const cluster in scores[ivTest]) {
        if (scores[ivTest].hasOwnProperty(cluster)) {
          let numerator = 0;
          let denominator = 0;
          for (let i = 0; i < scores[ivTest][cluster].scores.length; i++) {
            if (scores[ivTest][cluster].scores[i] - mean > 0) {
              numerator += scores[ivTest][cluster].scores[i] - mean;
              denominator++;
            } else {
              break;
            }
          }
          sortable.push([cluster, numerator / denominator]);
        }
      }
      sortable.sort((a, b) => b[1] - a[1]);
      if (className === sortable[0][0]) {
        res[className].numberOfMatches++;
      }
      res[className].numberOfSamples++;
    }
  }
  computePercent(res);
  return res;
};

const countMeanMatch = scores => {
  let res = {};
  for (let ivTest in scores) {
    if (scores.hasOwnProperty(ivTest)) {
      let className = ivTest.split('-')[0];
      if (!res[className]) {
        res[className] = {
          numberOfMatches: 0,
          numberOfSamples: 0
        };
      }
      let sortable = [];
      for (let cluster in scores[ivTest]) {
        if (scores[ivTest].hasOwnProperty(cluster)) {
          let numerator = 0;
          for (let i = 0; i < scores[ivTest][cluster].numberOfMatches;
               i++) {
            numerator += Math.log(scores[ivTest][cluster].scores[i]);
          }
          sortable.push([cluster,
            numerator / scores[ivTest][cluster].numberOfMatches]);
        }
      }
      sortable.sort((a, b) => b[1] - a[1]);
      if (className === sortable[0][0]) {
        res[className].numberOfMatches++;
      }
      res[className].numberOfSamples++;
    }
  }
  computePercent(res);
  return res;
};

export {countMean, countMeanAVG, countMeanMatch};

const computeMean = scores => {
  let res = {};
  for (let ivTest in scores) {
    if (scores.hasOwnProperty(ivTest)) {
      res[ivTest] = {};
      let sortable = [];
      for (let cluster in scores[ivTest]) {
        if (scores[ivTest].hasOwnProperty(cluster)) {
          sortable.push([cluster,
            scores[ivTest][cluster].scores.reduce((a, b) => a + b) /
            scores[ivTest][cluster].scores.length]);
        }
      }
      sortable.sort((a, b) => b[1] - a[1]);
      for (let i = 0; i < sortable.length; i++) {
        res[ivTest][sortable[i][0]] = sortable[i][1];
      }
    }
  }
  return res;
};

const computeMeanMatch = scores => {
  let res = {};
  for (let ivTest in scores) {
    if (scores.hasOwnProperty(ivTest)) {
      res[ivTest] = {};
      let sortable = [];
      for (let cluster in scores[ivTest]) {
        if (scores[ivTest].hasOwnProperty(cluster)) {
          let numerator = 0;
          for (let i = 0; i < scores[ivTest][cluster].numberOfMatches;
               i++) {
            numerator += scores[ivTest][cluster].scores[i];
          }
          sortable.push([cluster,
            numerator / scores[ivTest][cluster].numberOfMatches]);
        }
      }
      sortable.sort((a, b) => b[1] - a[1]);
      for (let i = 0; i < sortable.length; i++) {
        res[ivTest][sortable[i][0]] = sortable[i][1];
      }
    }
  }
  return res;
};

const percentMatch = scores => {
  let res = {};
  for (let ivTest in scores) {
    if (scores.hasOwnProperty(ivTest)) {
      res[ivTest] = {};
      let sortable = [];
      for (let cluster in scores[ivTest]) {
        if (scores[ivTest].hasOwnProperty(cluster)) {
          sortable.push([cluster,
            (scores[ivTest][cluster].numberOfMatches /
            scores[ivTest][cluster].scores.length) * 100]);
        }
      }
      sortable.sort((a, b) => b[1] - a[1]);
      for (let i = 0; i < sortable.length; i++) {
        res[ivTest][sortable[i][0]] =
          Math.floor(sortable[i][1] * 100) / 100 + ' %';
      }
    }
  }
  return res;
};

const bestMatches = (scores, maxItem) => {
  let res = {};

  for (let ivTest in scores) {
    if (scores.hasOwnProperty(ivTest)) {
      res[ivTest] = {};
      let sortable = [];
      for (let cluster in scores[ivTest]) {
        if (scores[ivTest].hasOwnProperty(cluster)) {
          for (let i = 0; i < scores[ivTest][cluster].scores.length; i++) {
            sortable.push([cluster, scores[ivTest][cluster].scores[i]]);
          }
        }
      }
      sortable.sort((a, b) => b[1] - a[1]);
      for (let i = 0; i < sortable.length; i++) {
        res[ivTest] = sortable.slice(0, maxItem);
      }
    }
  }

  return res;
};

export {computeMean, computeMeanMatch, percentMatch, bestMatches};

const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs'));

export default function parseResults(path) {
  return new BluebirdPromise(resolve => {
    fs.readFileAsync(path)
      .then(data => {
        data = data.toString();
        data = data.split('\n');
        let parser = {};
        data.forEach(line => {
          if (line) {
            line = line.split(' ');
            line.splice(0, 1);
            let className = line[0].split('-')[0];
            if (!parser[line[2]]) {
              parser[line[2]] = {};
            }
            if (!parser[line[2]][className]) {
              parser[line[2]][className] =
              {scores: [], numberOfMatches: 0};
            }
            parser[line[2]][className].scores.push(+line[3]);
            if (+line[1]) {
              parser[line[2]][className].numberOfMatches++;
            }
          }
        });

        for (let ivTest in parser) {
          if (parser.hasOwnProperty(ivTest)) {
            for (let cluster in parser[ivTest]) {
              if (parser[ivTest].hasOwnProperty(cluster)) {
                parser[ivTest][cluster].scores.sort((a, b) => b - a);
              }
            }
          }
        }
        resolve(parser);
      });
  });
}

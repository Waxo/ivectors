const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

const exec = require('child_process').exec;

const dir = './Yawn';
const bitrate = '256k';
const sampleRate = '16000';

const execAsync = (execute, stdoutON) => {
  return new BluebirdPromise((resolve, reject) => {
    exec(execute, (error, stdout, stderr) => {
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        reject();
      }
      if (error !== null) {
        console.log(`exec error: ${error}`);
      }
      if (stdoutON) {
        console.log(`stdout: ${stdout}`);
      }

      resolve();
    });
  });
};

fs.readdirAsync(dir)
  .then(files => BluebirdPromise.map(files,
    file => execAsync(
      `ffmpeg -i ./${dir}/${file} -ab ${bitrate} -ar ${sampleRate} ${file}`)))
  .then(() => console.log('done'));


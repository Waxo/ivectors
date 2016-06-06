import Ember from 'ember';
const PromiseB = require('bluebird');
const fs = PromiseB.promisifyAll(require('fs'));
const rimraf = PromiseB.promisify(require('rimraf'));
const wavFileInfo = require('wav-file-info');
const exec = require('child_process').exec;

let SPro = Ember.Object.extend({
  init() {
    let readFolders = [];
    this.clean()
      .then(() => this.regenerate())
      .then(() => fs.readdirAsync(this.input))
      .then(folders => {
        this.folders = folders;
        this.folders.forEach(folder => {
          readFolders.push(fs.readdirAsync(`${this.input}/${folder}`));
          fs.mkdir(`${this.output}/${folder}`);
          fs.mkdir(`${this.label}/${folder}`);
        });
        return PromiseB.all(readFolders);
      })
      .then((filesByFolder) => {
        this.files = [];
        for (let i = 0; i < this.folders.length; i++) {
          filesByFolder[i].forEach(file => { // jshint ignore:line
            this.files.push(`${this.folders[i]}/${file}`);
          });
        }
        this.writeDataAndLbl();
      })
      .catch(err => console.log(err));
  },

  clean() {
    let op = [];
    return PromiseB.all([
      this.exist(this.output),
      this.exist(this.label),
      this.exist(`${this.path}/data.lst`)
    ]).then(([output, label, data])=> {
      if (output) {
        op.push(rimraf(this.output));
      }

      if (label) {
        op.push(rimraf(this.label));
      }

      if (data) {
        op.push(fs.unlinkAsync(`${this.path}/data.lst`));
      }
      return PromiseB.all(op);
    });
  },

  regenerate() {
    return PromiseB.all([
      fs.mkdirAsync(this.output),
      fs.mkdirAsync(this.label)
    ]);
  },

  exist(path) {
    return new PromiseB((resolve) => {
      fs.statAsync(path)
        .then(() => resolve(true))
        .catch(() =>resolve(false));
    });
  },

  retrieveName(filename) {
    return filename.split('.')[0];
  },

  writeDataAndLbl() {
    this.files.forEach(file => {
      let name = this.retrieveName(file);
      let input = `${this.input}/${file}`;
      let output = `${this.output}/${name}.prm`;
      let command = `${this.specificPath}/00_sfbcep`;
      fs.appendFile(`${this.path}/data.lst`, name + '\n');
      exec(`${command} -F PCM16 -p 19 -e -D -A ${input} ${output}`);
      wavFileInfo.infoByFilename(input, (err, info) => {
        let line = `0 ${info.duration} sound`;
        fs.writeFile(`${this.label}/${name}.lbl`, line, () => {
        });
      });
    });
    this.set('isDone', true);
  }
});

export default SPro;

// var a = new SPro('input', 'output', 'lbl');

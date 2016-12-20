import Ember from 'ember';
import SPro from 'ivectors/ivectors/0_1_Prepare_PRM/Spro';
const exec = require('child_process').exec;

const ivectorsPath = `${process.cwd()}/app/ivectors`;
const contextPath = `${ivectorsPath}/0_1_Prepare_PRM`;
const prmPath = `${ivectorsPath}/prm`;
const lblPath = `${ivectorsPath}/lbl`;

export default Ember.Component.extend({
  tagName: '',
  isPrepareDone: false,
  isPrepareProcess: false,
  isEnergyDone: false,
  isEnergyProcess: false,
  isFeaturesProcess: false,
  isFeaturesDone: false,
  actions: {
    prepareFiles() {
      console.log('Prepare');
      this.set('isPrepareProcess', true);

      const spro = SPro.create({
        path: ivectorsPath,
        specificPath: contextPath,
        input: `${contextPath}/input`,
        output: prmPath,
        label: lblPath,
        isDone: false
      });

      spro.addObserver('isDone', () => {
        this.set('isPrepareProcess', !spro.get('isDone'));
        this.set('isPrepareDone', spro.get('isDone'));
      });
    },

    normEnergy() {
      console.log('Energy');
      this.set('isEnergyProcess', true);
      let command = `${contextPath}/NormFeat`;
      let options = [
        `--config ${contextPath}/cfg/NormFeat_energy.cfg`,
        `--inputFeatureFilename ${ivectorsPath}/data.lst`,
        `--featureFilesPath ${prmPath}/`
      ];

      let execute = `${command} ${options.join(' ')}`;
      exec(execute, (error, stdout, stderr) => {
        if (stderr) {
          console.log(`stderr: ${stderr}`);
        }
        if (error !== null) {
          console.log(`exec error: ${error}`);
        }
        this.set('isEnergyProcess', false);
        this.set('isEnergyDone', true);
      });
    },

    normFeatures() {
      console.log('Features');
      this.set('isFeaturesProcess', true);
      let command = `${contextPath}/NormFeat`;
      let options = [
        `--config ${contextPath}/cfg/NormFeat.cfg`,
        `--inputFeatureFilename ${ivectorsPath}/data.lst`,
        `--featureFilesPath ${prmPath}/`,
        `--labelFilesPath ${lblPath}/`
      ];

      let execute = `${command} ${options.join(' ')}`;
      exec(execute, (error, stdout, stderr) => {
        if (stderr) {
          console.log(`stderr: ${stderr}`);
        }
        if (error !== null) {
          console.log(`exec error: ${error}`);
        }
        this.set('isFeaturesProcess', false);
        this.set('isFeaturesDone', true);
      });
    }
  }
});

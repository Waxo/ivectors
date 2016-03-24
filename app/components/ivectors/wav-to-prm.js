import Ember from 'ember';
import SPro from '../../ivectors/0_1_Prepare_PRM/Spro';
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
    PrepareFiles() {
      console.log('Prepare');
      this.set('isPrepareProcess', true);

      var spro = SPro.create({
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

    NormEnergy() {
      console.log('Energy');
      this.set('isEnergyProcess', true);
      let command = `${contextPath}/NormFeat`;
      let config = `--config ${contextPath}/cfg/NormFeat_energy.cfg`;
      let input = `--inputFeatureFilename ${ivectorsPath}/data.lst`;
      let filePath = `--featureFilesPath ${prmPath}/`;

      let execute = `${command} ${config} ${input} ${filePath}`;
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

    NormFeatures() {
      console.log('Features');
      this.set('isFeaturesProcess', true);
      let command = `${contextPath}/NormFeat`;
      let config = `--config ${contextPath}/cfg/NormFeat.cfg`;
      let input = `--inputFeatureFilename ${ivectorsPath}/data.lst`;
      let filePath = `--featureFilesPath ${prmPath}/`;
      let labelPath = `--labelFilesPath ${lblPath}/`;
      let execute = `${command} ${config} ${input} ${filePath} ${labelPath}`;
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

import Ember from 'ember';
import config from './config/environment';

const Router = Ember.Router.extend({
  location: config.locationType
});

Router.map(function() {
  this.route('ivectors', function() {
    this.route('prepare-prm');
    this.route('ubm-tv');
    this.route('extract-classes');
    this.route('wav-to-ivectors');
    this.route('score');
    this.route('learn-common-UBM');
  });
});

export default Router;

import Ember from 'ember';
import config from './config/environment';

const Router = Ember.Router.extend({
  location: config.locationType,
  rootURL: config.rootURL
});

Router.map(function() {
  this.route('ivectors', function() {
    this.route('prepare-prm');
    this.route('ubm-tv');
    this.route('extract-classes');
    this.route('wav-to-ivectors');
    this.route('learn-common-ubm');
    this.route('learn-dependent-ubm');
    this.route('cleaner');

    this.route('score', function() {
      this.route('cosine');
      this.route('efr');
      this.route('sphnorm');
      this.route('plda-norm');
    });
  });
  this.route('ivectors-leave-one-out');
});

export default Router;

import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('ivectors/score/score-plda-norm', 'Integration | Component | ivectors/score/score plda norm', {
  integration: true
});

test('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{ivectors/score/score-plda-norm}}`);

  assert.equal(this.$().text().trim(), '');

  // Template block usage:
  this.render(hbs`
    {{#ivectors/score/score-plda-norm}}
      template block text
    {{/ivectors/score/score-plda-norm}}
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});

import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('ivectors/score/score-sphnorm-plda', 'Integration | Component | ivectors/score/score sphnorm plda', {
  integration: true
});

test('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{ivectors/score/score-sphnorm-plda}}`);

  assert.equal(this.$().text().trim(), '');

  // Template block usage:
  this.render(hbs`
    {{#ivectors/score/score-sphnorm-plda}}
      template block text
    {{/ivectors/score/score-sphnorm-plda}}
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});

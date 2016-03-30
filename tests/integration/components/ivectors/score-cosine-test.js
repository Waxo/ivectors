import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('ivectors/score-cosine', 'Integration | Component | ivectors/score cosine', {
  integration: true
});

test('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{ivectors/score-cosine}}`);

  assert.equal(this.$().text().trim(), '');

  // Template block usage:
  this.render(hbs`
    {{#ivectors/score-cosine}}
      template block text
    {{/ivectors/score-cosine}}
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});

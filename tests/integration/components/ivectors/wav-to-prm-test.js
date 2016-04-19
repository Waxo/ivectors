import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('wav-to-prm', 'Integration | Component | wav to prm', {
  integration: true
});

test('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'sum');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{wav-to-prm}}`);

  assert.equal(this.$().text().trim(), '');

  // Template block usage:
  this.render(hbs`
    {{#wav-to-prm}}
      template block text
    {{/wav-to-prm}}
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});

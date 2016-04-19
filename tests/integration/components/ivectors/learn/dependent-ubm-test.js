import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('ivectors/learn/dependent-ubm', 'Integration | Component | ivectors/learn/dependent ubm', {
  integration: true
});

test('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{ivectors/learn/dependent-ubm}}`);

  assert.equal(this.$().text().trim(), '');

  // Template block usage:
  this.render(hbs`
    {{#ivectors/learn/dependent-ubm}}
      template block text
    {{/ivectors/learn/dependent-ubm}}
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});

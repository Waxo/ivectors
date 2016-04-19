import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('ivectors/learn/common-ubm', 'Integration | Component | ivectors/learn/common ubm', {
  integration: true
});

test('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{ivectors/learn/common-ubm}}`);

  assert.equal(this.$().text().trim(), '');

  // Template block usage:
  this.render(hbs`
    {{#ivectors/learn/common-ubm}}
      template block text
    {{/ivectors/learn/common-ubm}}
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});

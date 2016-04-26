import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('ivectors/creating-ivectors-dependent', 'Integration | Component | ivectors/creating ivectors dependent', {
  integration: true
});

test('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{ivectors/creating-ivectors-dependent}}`);

  assert.equal(this.$().text().trim(), '');

  // Template block usage:
  this.render(hbs`
    {{#ivectors/creating-ivectors-dependent}}
      template block text
    {{/ivectors/creating-ivectors-dependent}}
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});
import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('ivectors/ubm-tv-training', 'Integration | Component | ivectors/ubm tv training', {
  integration: true
});

test('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{ivectors/ubm-tv-training}}`);

  assert.equal(this.$().text().trim(), '');

  // Template block usage:
  this.render(hbs`
    {{#ivectors/ubm-tv-training}}
      template block text
    {{/ivectors/ubm-tv-training}}
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});

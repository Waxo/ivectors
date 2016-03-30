import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('ivectors/classes-extractor', 'Integration | Component | ivectors/classes extractor', {
  integration: true
});

test('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{ivectors/classes-extractor}}`);

  assert.equal(this.$().text().trim(), '');

  // Template block usage:
  this.render(hbs`
    {{#ivectors/classes-extractor}}
      template block text
    {{/ivectors/classes-extractor}}
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});

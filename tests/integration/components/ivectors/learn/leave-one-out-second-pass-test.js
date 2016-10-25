import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('ivectors/learn/leave-one-out-second-pass', 'Integration | Component | ivectors/learn/leave one out second pass', {
  integration: true
});

test('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{ivectors/learn/leave-one-out-second-pass}}`);

  assert.equal(this.$().text().trim(), '');

  // Template block usage:
  this.render(hbs`
    {{#ivectors/learn/leave-one-out-second-pass}}
      template block text
    {{/ivectors/learn/leave-one-out-second-pass}}
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});

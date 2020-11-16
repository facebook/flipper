import {TestUtils} from 'flipper-plugin';
import * as Plugin from '..';

// Read more: https://fbflipper.com/docs/tutorial/js-custom#testing-plugin-logic
// API: https://fbflipper.com/docs/tutorial/js-custom#testing-plugin-logic
test('It can store data', () => {
  const {instance, sendEvent} = TestUtils.startPlugin(Plugin);

  expect(instance.data.get()).toEqual({});

  sendEvent('newData', {id: 'firstID'});
  sendEvent('newData', {id: 'secondID'});

  expect(instance.data.get()).toMatchInlineSnapshot(`
    Object {
      "firstID": Object {
        "id": "firstID",
      },
      "secondID": Object {
        "id": "secondID",
      },
    }
  `);
});

// Read more: https://fbflipper.com/docs/tutorial/js-custom#testing-plugin-logic
// API: https://fbflipper.com/docs/tutorial/js-custom#testing-plugin-logic
test('It can render data', async () => {
  const {instance, renderer, sendEvent} = TestUtils.renderPlugin(Plugin);

  expect(instance.data.get()).toEqual({});

  sendEvent('newData', {id: 'firstID'});
  sendEvent('newData', {id: 'secondID'});

  expect(await renderer.findByTestId('firstID')).not.toBeNull();
  expect(await renderer.findByTestId('secondID')).toMatchInlineSnapshot(`
    <pre
      data-testid="secondID"
    >
      {"id":"secondID"}
    </pre>
  `);
});

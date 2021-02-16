import {TestUtils} from 'flipper-plugin';
import * as Plugin from '..';

// Read more: https://fbflipper.com/docs/tutorial/js-custom#testing-plugin-logic
// API: https://fbflipper.com/docs/tutorial/js-custom#testing-plugin-logic
test('It can store data', () => {
  const {instance, sendLogEntry} = TestUtils.startDevicePlugin(Plugin);

  expect(instance.data.get()).toEqual([]);

  sendLogEntry({
    date: new Date(1611854112859),
    message: 'test1',
    pid: 0,
    tag: 'test',
    tid: 1,
    type: 'error',
    app: 'X',
  });
  sendLogEntry({
    date: new Date(1611854117859),
    message: 'test2',
    pid: 2,
    tag: 'test',
    tid: 3,
    type: 'warn',
    app: 'Y',
  });

  expect(instance.data.get()).toMatchInlineSnapshot(`
    Array [
      "test1",
      "test2",
    ]
  `);
});

// Read more: https://fbflipper.com/docs/tutorial/js-custom#testing-plugin-logic
// API: https://fbflipper.com/docs/tutorial/js-custom#testing-plugin-logic
test('It can render data', async () => {
  const {instance, renderer, sendLogEntry} = TestUtils.renderDevicePlugin(
    Plugin,
  );

  expect(instance.data.get()).toEqual([]);

  sendLogEntry({
    date: new Date(1611854112859),
    message: 'test1',
    pid: 0,
    tag: 'test',
    tid: 1,
    type: 'error',
    app: 'X',
  });
  sendLogEntry({
    date: new Date(1611854117859),
    message: 'test2',
    pid: 2,
    tag: 'test',
    tid: 3,
    type: 'warn',
    app: 'Y',
  });

  expect(await renderer.findByTestId('0')).not.toBeNull();
  expect(await renderer.findByTestId('1')).toMatchInlineSnapshot();
});

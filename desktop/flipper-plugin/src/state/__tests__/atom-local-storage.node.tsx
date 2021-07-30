/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createState} from '../atom';
import * as TestUtils from '../../test-utils/test-utils';

beforeEach(() => {
  window.localStorage.clear();
});

test('it can start a plugin and lifecycle events', () => {
  window.localStorage.setItem('flipper:TestPlugin:atom:x', '{ "x": 2 }');

  const testPlugin = {
    plugin() {
      const x = createState<{x: number}>(
        {x: 1},
        {
          persist: 'x',
          persistToLocalStorage: true,
        },
      );
      const y = createState(true, {
        persist: 'y',
        persistToLocalStorage: true,
      });

      return {x, y};
    },
    Component() {
      return null;
    },
  };

  const {instance} = TestUtils.startPlugin(testPlugin);
  expect(instance.x.get()).toEqual({x: 2});
  expect(instance.y.get()).toEqual(true);
  expect(getStorageSnapshot()).toMatchInlineSnapshot(`
    Object {
      "flipper:TestPlugin:atom:x": "{ \\"x\\": 2 }",
    }
  `);

  instance.x.update((d) => {
    d.x++;
  });
  instance.y.set(false);
  expect(getStorageSnapshot()).toMatchInlineSnapshot(`
    Object {
      "flipper:TestPlugin:atom:x": "{\\"x\\":3}",
      "flipper:TestPlugin:atom:y": "false",
    }
  `);
});

function getStorageSnapshot() {
  const res: Record<string, string> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)!;
    res[key] = window.localStorage.getItem(key)!;
  }
  return res;
}

test('localStorage requires persist key', () => {
  expect(() =>
    createState(3, {persistToLocalStorage: true}),
  ).toThrowErrorMatchingInlineSnapshot(
    `"The 'persist' option should be set when 'persistToLocalStorage' is set"`,
  );
});

test('localStorage requires plugin context', () => {
  expect(() =>
    createState(3, {persistToLocalStorage: true, persist: 'x'}),
  ).toThrowErrorMatchingInlineSnapshot(
    `"The 'persistToLocalStorage' option cannot be used outside a plugin definition"`,
  );
});

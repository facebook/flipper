/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {TestUtils} from '../../';
import React from 'react';
import {getNuxKey} from '../NUX';

test('nuxkey computation', async () => {
  // Not a very good test, as our hashing api's are not available in Node...
  expect(await getNuxKey('test')).toMatchInlineSnapshot(`"flipper:test"`);
  expect(await getNuxKey('test2')).toMatchInlineSnapshot(`"flipper:test2"`);
  expect(await getNuxKey(<div>bla</div>)).toMatchInlineSnapshot(`
    "flipper:<div>
      bla
    </div>"
  `);
  expect(await getNuxKey(<div>bla2</div>)).toMatchInlineSnapshot(`
    "flipper:<div>
      bla2
    </div>"
  `);
});

test('nuxkey computation with plugin', async () => {
  const res = TestUtils.startPlugin({
    Component() {
      return null;
    },
    plugin() {
      return {};
    },
  });

  expect(
    await getNuxKey('test', (res as any)._backingInstance),
  ).toMatchInlineSnapshot(`"TestPlugin:test"`);
});

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {TestUtils} from 'flipper-plugin';
import React from 'react';
import {getNuxKey} from '../NUX';

test('nuxkey computation', () => {
  expect(getNuxKey('test')).toMatchInlineSnapshot(
    `"flipper:n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg="`,
  );
  expect(getNuxKey('test')).toMatchInlineSnapshot(
    `"flipper:n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg="`,
  );
  expect(getNuxKey('test2')).toMatchInlineSnapshot(
    `"flipper:YDA64iuZiGG847KPM+7BvnWKITyGyTwHbb6fVYwRx1I="`,
  );
  expect(getNuxKey(<div>bla</div>)).toMatchInlineSnapshot(
    `"flipper:myN0Mqqzs3fPwYDKGEQVG9XD9togJNWYJiy1VNQOf18="`,
  );
  expect(getNuxKey(<div>bla2</div>)).toMatchInlineSnapshot(
    `"flipper:B6kICeYCJMWeUThs5TWCLuiwCqzr5cWn67xXA4ET0bU="`,
  );
});

test('nuxkey computation with plugin', () => {
  const res = TestUtils.startPlugin({
    Component() {
      return null;
    },
    plugin() {
      return {};
    },
  });

  expect(
    getNuxKey('test', (res as any)._backingInstance),
  ).toMatchInlineSnapshot(
    `"TestPlugin:n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg="`,
  );
});

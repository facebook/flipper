/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperPlugin} from 'flipper';

export default class extends FlipperPlugin {
  static id = 'Static ID';
}

test('TestPlugin', () => {
  // supress jest warning
  expect(true).toBeTruthy();
});

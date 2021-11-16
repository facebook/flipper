/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperPlugin} from '../../plugin';

export default class extends FlipperPlugin<any, any, any> {
  static id = 'Static ID';
}

test('TestPlugin', () => {
  // supress jest warning
  expect(true).toBeTruthy();
});

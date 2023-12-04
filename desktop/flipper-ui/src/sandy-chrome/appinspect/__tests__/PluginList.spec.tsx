/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  createMockFlipperWithPlugin,
  MockFlipperResult,
} from '../../../__tests__/test-utils/createMockFlipperWithPlugin';
import {FlipperPlugin} from '../../../plugin';
import {_SandyPluginDefinition} from 'flipper-plugin';

import {getActiveDevice} from '../../../selectors/connections';

class TestPlugin extends FlipperPlugin<any, any, any> {}

describe('basic getActiveDevice', () => {
  let flipper: MockFlipperResult;
  beforeEach(async () => {
    flipper = await createMockFlipperWithPlugin(TestPlugin);
  });

  test('getActiveDevice prefers selected device', () => {
    const {device, store} = flipper;
    expect(getActiveDevice(store.getState())).toBe(device);
  });

  test('getActiveDevice picks device of current client', () => {
    const {device, store} = flipper;
    expect(getActiveDevice(store.getState())).toBe(device);
  });

  test('getActiveDevice picks preferred device if no client and device', () => {
    const {device, store} = flipper;
    expect(getActiveDevice(store.getState())).toBe(device);
  });
});

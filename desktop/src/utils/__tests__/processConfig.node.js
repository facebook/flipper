/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {default as config, resetConfigForTesting} from '../processConfig.tsx';

afterEach(() => {
  resetConfigForTesting();
});

test('config is decoded from env', () => {
  process.env.CONFIG = JSON.stringify({
    disabledPlugins: ['pluginA', 'pluginB', 'pluginC'],
    pluginPaths: ['/a/path', 'b/path'],
    lastWindowPosition: {x: 4, y: 8, width: 15, height: 16},
    launcherMsg: 'wubba lubba dub dub',
    updaterEnabled: false,
    screenCapturePath: '/my/screenshot/path',
    launcherEnabled: false,
  });

  expect(config()).toEqual({
    disabledPlugins: new Set(['pluginA', 'pluginB', 'pluginC']),
    pluginPaths: ['/a/path', 'b/path'],
    lastWindowPosition: {x: 4, y: 8, width: 15, height: 16},
    launcherMsg: 'wubba lubba dub dub',
    updaterEnabled: false,
    screenCapturePath: '/my/screenshot/path',
    launcherEnabled: false,
  });
});

test('config is decoded from env with defaults', () => {
  process.env.CONFIG = '{}';

  expect(config()).toEqual({
    disabledPlugins: new Set([]),
    pluginPaths: [],
    lastWindowPosition: undefined,
    launcherMsg: undefined,
    updaterEnabled: true,
    screenCapturePath: undefined,
    launcherEnabled: true,
  });
});

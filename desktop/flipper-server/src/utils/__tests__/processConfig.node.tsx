/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {loadProcessConfig} from '../processConfig';

test('config is decoded from env', () => {
  const config = loadProcessConfig({
    CONFIG: JSON.stringify({
      disabledPlugins: ['pluginA', 'pluginB', 'pluginC'],
      lastWindowPosition: {x: 4, y: 8, width: 15, height: 16},
      launcherMsg: 'wubba lubba dub dub',
      screenCapturePath: '/my/screenshot/path',
      launcherEnabled: false,
      suppressPluginUpdateNotifications: true,
      updaterEnabled: true,
    }),
  });

  expect(config).toEqual({
    disabledPlugins: ['pluginA', 'pluginB', 'pluginC'],
    lastWindowPosition: {x: 4, y: 8, width: 15, height: 16},
    launcherMsg: 'wubba lubba dub dub',
    screenCapturePath: '/my/screenshot/path',
    launcherEnabled: false,
    suppressPluginUpdateNotifications: true,
    updaterEnabled: true,
  });
});

test('config is decoded from env with defaults', () => {
  expect(loadProcessConfig({CONFIG: '{}'})).toEqual({
    disabledPlugins: [],
    lastWindowPosition: undefined,
    launcherMsg: undefined,
    screenCapturePath: undefined,
    launcherEnabled: true,
    suppressPluginUpdateNotifications: false,
    updaterEnabled: true,
  });
});

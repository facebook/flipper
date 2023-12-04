/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ProcessConfig} from 'flipper-common';

export function loadProcessConfig(env: NodeJS.ProcessEnv): ProcessConfig {
  const json = JSON.parse(env.CONFIG || '{}');
  return {
    disabledPlugins: json.disabledPlugins || [],
    lastWindowPosition: json.lastWindowPosition,
    launcherMsg: json.launcherMsg,
    screenCapturePath: json.screenCapturePath,
    launcherEnabled:
      typeof json.launcherEnabled === 'boolean' ? json.launcherEnabled : true,
    updaterEnabled:
      typeof json.updaterEnabled === 'boolean' ? json.updaterEnabled : true,
    suppressPluginUpdateNotifications:
      typeof json.suppressPluginUpdateNotifications === 'boolean'
        ? json.suppressPluginUpdateNotifications
        : false,
  };
}

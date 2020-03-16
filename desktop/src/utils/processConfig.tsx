/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {remote} from 'electron';

export type ProcessConfig = {
  disabledPlugins: Set<string>;
  pluginPaths: Array<string>;
  lastWindowPosition: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  screenCapturePath: string | null;
  launcherMsg: string | null;
  updaterEnabled: boolean;
  // Controls whether to delegate to the launcher if present.
  launcherEnabled: boolean;
};

let configObj: ProcessConfig | null = null;
export default function config(): ProcessConfig {
  if (configObj === null) {
    const json = JSON.parse(
      (remote && remote.process.env.CONFIG) || process.env.CONFIG || '{}',
    );
    configObj = {
      disabledPlugins: new Set(json.disabledPlugins || []),
      pluginPaths: json.pluginPaths || [],
      lastWindowPosition: json.lastWindowPosition,
      launcherMsg: json.launcherMsg,
      updaterEnabled:
        typeof json.updaterEnabled === 'boolean' ? json.updaterEnabled : true,
      screenCapturePath: json.screenCapturePath,
      launcherEnabled:
        typeof json.launcherEnabled === 'boolean' ? json.launcherEnabled : true,
    };
  }

  return configObj;
}

export function resetConfigForTesting() {
  configObj = null;
}

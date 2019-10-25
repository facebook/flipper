/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

type Config = {
  pluginPaths?: string[],
  disabledPlugins?: string[],
  lastWindowPosition?: {
    width: number,
    height: number
  },
  updater?: boolean | undefined,
  launcherMsg?: string | undefined,
};

export default function(argv: {
  updater?: boolean,
  launcherMsg?: string
}): {config: Config, configPath: string, flipperDir: string};

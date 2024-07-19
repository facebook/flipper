/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import os from 'os';
import xdg from 'xdg-basedir';
import fs from 'fs-extra';
import TOML, {JsonMap} from '@iarna/toml';
import {LauncherSettings, ReleaseChannel} from 'flipper-common';

// There is some disagreement among the XDG Base Directory implementations
// whether to use ~/Library/Preferences or ~/.config on MacOS. The Launcher
// expects the former, whereas `xdg-basedir` implements the latter.
export function xdgConfigDir() {
  return os.platform() === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Preferences')
    : xdg.config || path.join(os.homedir(), '.config');
}

export function launcherConfigDir() {
  return path.join(
    xdgConfigDir(),
    os.platform() == 'darwin' ? 'rs.flipper-launcher' : 'flipper-launcher',
  );
}

function getLauncherSettingsFile(): string {
  return path.resolve(launcherConfigDir(), 'flipper-launcher.toml');
}

const defaultLauncherSettings: LauncherSettings = {
  releaseChannel: ReleaseChannel.DEFAULT,
  ignoreLocalPin: true,
};

interface FormattedSettings {
  ignore_local_pin?: boolean;
  release_channel?: ReleaseChannel;
}

function serialize(value: LauncherSettings): string {
  const {ignoreLocalPin, releaseChannel, ...rest} = value;
  const formattedSettings: FormattedSettings = {
    ...rest,
    ignore_local_pin: ignoreLocalPin,
    release_channel: releaseChannel,
  };
  return TOML.stringify(formattedSettings as JsonMap);
}

function deserialize(content: string): LauncherSettings {
  const {ignore_local_pin, release_channel, ...rest} = TOML.parse(
    content,
  ) as FormattedSettings;
  return {
    ...rest,
    ignoreLocalPin: !!ignore_local_pin,
    releaseChannel: release_channel ?? ReleaseChannel.DEFAULT,
  };
}

export async function loadLauncherSettings(
  enableLauncherSettings: boolean = true,
): Promise<LauncherSettings> {
  if (!enableLauncherSettings) {
    return defaultLauncherSettings;
  }

  const fileName = getLauncherSettingsFile();
  try {
    const content = (await fs.readFile(fileName)).toString();
    return deserialize(content);
  } catch (e) {
    console.warn(
      `Failed to read settings file: "${fileName}". ${e}. Replacing file with default settings.`,
    );
    await saveLauncherSettings(defaultLauncherSettings);
    return defaultLauncherSettings;
  }
}

export async function saveLauncherSettings(settings: LauncherSettings) {
  const fileName = getLauncherSettingsFile();
  const dir = path.dirname(fileName);
  const exists = await fs.pathExists(dir);
  if (!exists) {
    await fs.mkdir(dir, {recursive: true});
  }
  const content = serialize(settings);
  return fs.writeFile(fileName, content);
}

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs';
import path from 'path';
import TOML, {JsonMap} from '@iarna/toml';
import {Storage} from 'redux-persist/es/types';
import {
  defaultLauncherSettings,
  LauncherSettings,
} from '../reducers/launcherSettings';
import ReleaseChannel from '../ReleaseChannel';

export default class LauncherSettingsStorage implements Storage {
  constructor(readonly filepath: string) {}

  async getItem(_key: string): Promise<any> {
    return await this.parseFile();
  }

  async setItem(_key: string, value: LauncherSettings): Promise<any> {
    const originalValue = await this.parseFile();
    await this.writeFile(value);
    return originalValue;
  }

  removeItem(_key: string): Promise<void> {
    return this.writeFile(defaultLauncherSettings);
  }

  private async parseFile(): Promise<LauncherSettings> {
    try {
      const content = fs.readFileSync(this.filepath).toString();
      return deserialize(content);
    } catch (e) {
      console.warn(
        `Failed to read settings file: "${this.filepath}". ${e}. Replacing file with default settings.`,
      );
      await this.writeFile(defaultLauncherSettings);
      return defaultLauncherSettings;
    }
  }

  private async writeFile(value: LauncherSettings): Promise<void> {
    this.ensureDirExists();
    const content = serialize(value);
    fs.writeFileSync(this.filepath, content);
  }

  private ensureDirExists(): void {
    const dir = path.dirname(this.filepath);
    fs.existsSync(dir) || fs.mkdirSync(dir, {recursive: true});
  }
}

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

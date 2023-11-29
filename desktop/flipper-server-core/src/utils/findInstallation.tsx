/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import GK from '../fb-stubs/GK';

const pwaRoot = path.join(
  os.homedir(),
  'Applications',
  'Chrome Apps.localized',
);
const appFolder = path.resolve(pwaRoot, '.flipper');
const defaultAppPath = path.join(pwaRoot, 'Flipper.app');
const movedAppPath = path.join(appFolder, 'Flipper.app');

export async function movePWA(): Promise<void> {
  if (os.platform() !== 'darwin') {
    return;
  }

  if (!GK.get('flipper_move_pwa')) {
    return;
  }

  // Move PWA into its own folder
  // Later we will make the folder hidden so Spotlight stops indexing it
  // Sadly, Spotlight can stop indexing only hidden folder, not hidden files
  // Therefore, we have to create this parent folder in the first place.
  if (!(await fs.pathExists(appFolder))) {
    await fs.mkdir(appFolder);
  }
  await fs.move(defaultAppPath, movedAppPath);
}

export async function findInstallation(): Promise<string | undefined> {
  if (os.platform() !== 'darwin') {
    return;
  }

  try {
    if (GK.get('flipper_move_pwa')) {
      if (await fs.pathExists(defaultAppPath)) {
        await movePWA();
      }
    }
  } catch (e) {
    console.error('Failed to move PWA', e);
  } finally {
    if (GK.get('flipper_move_pwa')) {
      const movedAppPlistPath = path.join(
        movedAppPath,
        'Contents',
        'Info.plist',
      );
      if (await fs.pathExists(movedAppPlistPath)) {
        return movedAppPath;
      }
      // We should get here only if moving PWA failed
    }
    const dafaultAppPlistPath = path.join(
      defaultAppPath,
      'Contents',
      'Info.plist',
    );
    if (await fs.pathExists(dafaultAppPlistPath)) {
      return defaultAppPath;
    }
  }
}

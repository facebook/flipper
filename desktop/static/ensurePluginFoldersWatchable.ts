/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getPluginSourceFolders} from './getPluginFolders';
import fs from 'fs-extra';

const watchmanconfigName = '.watchmanconfig';

import path from 'path';

export default async function ensurePluginFoldersWatchable() {
  const pluginFolders = await getPluginSourceFolders();
  for (const pluginFolder of pluginFolders) {
    if (!(await hasParentWithWatchmanConfig(pluginFolder))) {
      // If no watchman config found in the plugins folder or any its parent, we need to create it.
      // Otherwise we won't be able to listen for plugin changes.
      await fs.writeJson(path.join(pluginFolder, watchmanconfigName), {});
    }
  }
}

async function hasParentWithWatchmanConfig(dir: string): Promise<boolean> {
  if (await fs.pathExists(path.join(dir, watchmanconfigName))) {
    return true;
  } else {
    const parent = path.dirname(dir);
    if (parent && parent != '' && parent !== dir) {
      return await hasParentWithWatchmanConfig(parent);
    }
  }
  return false;
}

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import electron from 'electron';
import lodash from 'lodash';
import isProduction from './isProduction';
import path from 'path';
import fs from 'fs';
import {promisify} from 'util';

const getPackageJSON = async () => {
  const base =
    isProduction() && electron.remote
      ? electron.remote.app.getAppPath()
      : process.cwd();
  const content = await promisify(fs.readFile)(
    path.join(base, 'package.json'),
    'utf-8',
  );
  return JSON.parse(content);
};

export const readCurrentRevision: () => Promise<
  string | undefined
> = lodash.memoize(async () => {
  // This is provided as part of the bundling process for headless.
  if (global.__REVISION__) {
    return global.__REVISION__;
  }
  const json = await getPackageJSON();
  return json.revision;
});

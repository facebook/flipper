/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import isFB from './isFB';

export const rootDir = path.resolve(__dirname, '..');
export const appDir = path.join(rootDir, 'app');
export const staticDir = path.join(rootDir, 'static');
export const defaultPluginsIndexDir = path.join(staticDir, 'defaultPlugins');
export const pluginsDir = path.join(rootDir, 'plugins');
export const fbPluginsDir = path.join(pluginsDir, 'fb');
export const fbPluginsSymlinkPath = path.join(pluginsDir, 'fb-link');
export const headlessDir = path.join(rootDir, 'headless');
export const distDir = path.resolve(rootDir, '..', 'dist');
export const babelTransformationsDir = path.resolve(
  rootDir,
  'babel-transformer',
  'src',
);
export const jsSharedDir = isFB ? path.resolve(rootDir, '../../js-shared') : '';
export const yarnLockSymlinkPath = path.join(rootDir, 'yarn.lock');
export const yarnLockPath = path.join(rootDir, 'locks', 'yarn.lock');
export const fbYarnLockPath = path.join(rootDir, 'locks', 'fb', 'yarn.lock');

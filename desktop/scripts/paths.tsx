/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';

export const rootDir = path.resolve(__dirname, '..');
export const sonarDir = path.resolve(__dirname, '..', '..');
export const uiDir = path.join(rootDir, 'flipper-ui');
export const staticDir = path.join(rootDir, 'static');
export const serverDir = path.join(rootDir, 'flipper-server');
export const defaultPluginsDir = path.join(staticDir, 'defaultPlugins');
export const pluginsDir = path.join(rootDir, 'plugins');
export const fbPluginsDir = path.join(pluginsDir, 'fb');
export const publicPluginsDir = path.join(pluginsDir, 'public');
export const distDir = path.resolve(rootDir, '..', 'dist');
export const babelTransformationsDir = path.resolve(
  rootDir,
  'babel-transformer',
  'src',
);

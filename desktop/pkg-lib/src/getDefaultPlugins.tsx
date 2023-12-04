/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getSourcePlugins} from 'flipper-plugin-lib';

// For insiders builds we bundle top 5 popular device plugins,
// plus top 10 popular "universal" plugins enabled by more than 100 users.
const hardcodedPlugins = new Set<string>([
  // Popular device plugins
  'DeviceLogs',
  'CrashReporter',
  'MobileBuilds',
  'Hermesdebuggerrn',
  'React',
  // Popular client plugins
  'Inspector',
  'Network',
  'AnalyticsLogging',
  'GraphQL',
  'UIPerf',
  'MobileConfig',
  'Databases',
  'FunnelLogger',
  'Navigation',
  'Fresco',
  'Preferences',
]);

export const getDefaultPlugins = async (isInsidersBuild: boolean) => {
  const sourcePlugins = await getSourcePlugins();
  const defaultPlugins = sourcePlugins
    // we only include a predefined set of regular plugins into insiders release
    .filter((p) => !isInsidersBuild || hardcodedPlugins.has(p.id));
  return defaultPlugins;
};

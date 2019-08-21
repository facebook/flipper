/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

// copied from Flipper dashboard
const pluginRanking = [
  'DeviceLogs',
  'Inspector',
  'Network',
  'AnalyticsLogging',
  'GraphQL',
  'oculus-service-logs',
  'UIPerf',
  'CrashReporter',
  'Msys',
  'React',
  'Databases',
  'notifications',
  'MobileConfig',
  'FunnelLogger',
  'Fresco',
  'MScreen',
  'Preferences',
  'DeviceCPU',
  'Hermesdebugger',
  'vros-event-profiler',
  'Mobileboost',
  'Sections',
  'Composer',
  'Stories',
  'DesignOverlay',
];

export function isTopUsedPlugin(pluginName: string, range: number): boolean {
  const rank = pluginRanking.findIndex((name: string) => {
    return name === pluginName;
  });
  return rank >= 0 && rank < range;
}

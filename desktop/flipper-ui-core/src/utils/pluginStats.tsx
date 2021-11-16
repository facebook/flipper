/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {onBytesReceived} from '../dispatcher/tracking';

type StatEntry = {
  cpuTimeTotal: number; // Total time spend in persisted Reducer
  cpuTimeDelta: number; // Time spend since previous tracking tick
  messageCountTotal: number; // amount of message received for this plugin
  messageCountDelta: number; // amout of messages received since previous tracking tick
  maxTime: number; // maximum time spend in a single reducer call
  bytesReceivedTotal: number; // Bytes received
  bytesReceivedDelta: number; // Bytes received since last tick
};

const MAX_BACKGROUND_TASK_TIME = 25;
const pluginBackgroundStats = new Map<string, StatEntry>();

export function resetPluginBackgroundStatsDelta() {
  pluginBackgroundStats.forEach((stat) => {
    stat.cpuTimeDelta = 0;
    stat.messageCountDelta = 0;
    stat.bytesReceivedDelta = 0;
  });
}

onBytesReceived((plugin: string, bytes: number) => {
  if (!pluginBackgroundStats.has(plugin)) {
    pluginBackgroundStats.set(plugin, createEmptyStat());
  }
  const stat = pluginBackgroundStats.get(plugin)!;
  stat.bytesReceivedTotal += bytes;
  stat.bytesReceivedDelta += bytes;
});

export function getPluginBackgroundStats(): {
  cpuTime: number; // amount of ms cpu used since the last stats (typically every minute)
  bytesReceived: number;
  byPlugin: {[plugin: string]: StatEntry};
} {
  let cpuTime: number = 0;
  let bytesReceived: number = 0;
  const byPlugin = Array.from(pluginBackgroundStats.entries()).reduce(
    (aggregated, [pluginName, data]) => {
      cpuTime += data.cpuTimeDelta;
      bytesReceived += data.bytesReceivedDelta;
      aggregated[pluginName] = data;
      return aggregated;
    },
    {} as {[plugin: string]: StatEntry},
  );
  return {
    cpuTime,
    bytesReceived,
    byPlugin,
  };
}

if (window) {
  // @ts-ignore
  window.flipperPrintPluginBackgroundStats = () => {
    console.table(
      Array.from(pluginBackgroundStats.entries()).map(
        ([
          plugin,
          {
            cpuTimeDelta,
            cpuTimeTotal,
            messageCountDelta,
            messageCountTotal,
            maxTime,
            bytesReceivedTotal,
            bytesReceivedDelta,
          },
        ]) => ({
          plugin,
          cpuTimeTotal,
          messageCountTotal,
          cpuTimeDelta,
          messageCountDelta,
          maxTime,
          bytesReceivedTotal,
          bytesReceivedDelta,
        }),
      ),
    );
  };
}

function createEmptyStat(): StatEntry {
  return {
    cpuTimeDelta: 0,
    cpuTimeTotal: 0,
    messageCountDelta: 0,
    messageCountTotal: 0,
    maxTime: 0,
    bytesReceivedTotal: 0,
    bytesReceivedDelta: 0,
  };
}

export function addBackgroundStat(plugin: string, cpuTime: number) {
  if (!pluginBackgroundStats.has(plugin)) {
    pluginBackgroundStats.set(plugin, createEmptyStat());
  }
  const stat = pluginBackgroundStats.get(plugin)!;
  stat.cpuTimeDelta += cpuTime;
  stat.cpuTimeTotal += cpuTime;
  stat.messageCountDelta += 1;
  stat.messageCountTotal += 1;
  stat.maxTime = Math.max(stat.maxTime, cpuTime);
  if (cpuTime > MAX_BACKGROUND_TASK_TIME) {
    console.warn(
      `Plugin ${plugin} took too much time while doing background: ${cpuTime}ms. Handling background messages should take less than ${MAX_BACKGROUND_TASK_TIME}ms.`,
    );
  }
}

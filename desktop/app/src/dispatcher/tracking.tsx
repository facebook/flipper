/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ipcRenderer, remote} from 'electron';
import {performance} from 'perf_hooks';
import {EventEmitter} from 'events';

import {State, Store} from '../reducers/index';
import {Logger} from '../fb-interfaces/Logger';
import Client from '../Client';
import {
  getPluginBackgroundStats,
  resetPluginBackgroundStatsDelta,
} from '../utils/pluginStats';
import {
  clearTimeline,
  TrackingEvent,
  State as UsageTrackingState,
  SelectedPluginData,
} from '../reducers/usageTracking';
import produce from 'immer';
import BaseDevice from '../devices/BaseDevice';
import {deconstructClientId, deconstructPluginKey} from '../utils/clientUtils';
import {getCPUUsage} from 'process';
import {getPluginKey} from '../utils/pluginUtils';

const TIME_SPENT_EVENT = 'time-spent';

type UsageInterval = {
  pluginKey: string | null;
  pluginData: SelectedPluginData | null;
  length: number;
  focused: boolean;
};

export type UsageSummary = {
  total: {focusedTime: number; unfocusedTime: number};
  plugin: {
    [pluginKey: string]: {
      focusedTime: number;
      unfocusedTime: number;
    } & SelectedPluginData;
  };
};

export const fpsEmitter = new EventEmitter();

// var is fine, let doesn't have the correct hoisting semantics
// eslint-disable-next-line no-var
var bytesReceivedEmitter: EventEmitter;

export function onBytesReceived(
  callback: (plugin: string, bytes: number) => void,
): () => void {
  if (!bytesReceivedEmitter) {
    bytesReceivedEmitter = new EventEmitter();
  }
  bytesReceivedEmitter.on('bytesReceived', callback);
  return () => {
    bytesReceivedEmitter.off('bytesReceived', callback);
  };
}

export function emitBytesReceived(plugin: string, bytes: number) {
  if (bytesReceivedEmitter) {
    bytesReceivedEmitter.emit('bytesReceived', plugin, bytes);
  }
}

export default (store: Store, logger: Logger) => {
  let droppedFrames: number = 0;
  let largeFrameDrops: number = 0;

  const oldExitData = loadExitData();
  if (oldExitData) {
    const isReload = remote.process.pid === oldExitData.pid;
    const timeSinceLastStartup =
      Date.now() - parseInt(oldExitData.lastSeen, 10);
    // console.log(isReload ? 'reload' : 'restart', oldExitData);
    logger.track('usage', isReload ? 'reload' : 'restart', {
      ...oldExitData,
      pid: undefined,
      timeSinceLastStartup,
    });
    // create fresh exit data
    const {selectedDevice, selectedApp, selectedPlugin} =
      store.getState().connections;
    persistExitData(
      {
        selectedDevice,
        selectedApp,
        selectedPlugin,
      },
      false,
    );
  }

  function droppedFrameDetection(
    past: DOMHighResTimeStamp,
    isWindowFocused: () => boolean,
  ) {
    const now = performance.now();
    requestAnimationFrame(() => droppedFrameDetection(now, isWindowFocused));
    const delta = now - past;
    const dropped = Math.round(delta / (1000 / 60) - 1);
    fpsEmitter.emit('fps', delta > 1000 ? 0 : Math.round(1000 / (now - past)));
    if (!isWindowFocused() || dropped < 1) {
      return;
    }
    droppedFrames += dropped;
    if (dropped > 3) {
      largeFrameDrops++;
    }
  }

  if (typeof window !== 'undefined') {
    droppedFrameDetection(
      performance.now(),
      () => store.getState().application.windowIsFocused,
    );
  }

  ipcRenderer.on('trackUsage', (event, ...args: any[]) => {
    let state: State;
    try {
      state = store.getState();
    } catch (e) {
      // if trackUsage is called (indirectly) through a reducer, this will utterly die Flipper. Let's prevent that and log an error instead
      console.error(
        'trackUsage triggered indirectly as side effect of a reducer. Event: ',
        event.type,
        event,
      );
      return;
    }
    const {selectedDevice, selectedPlugin, selectedApp, clients} =
      state.connections;

    persistExitData(
      {selectedDevice, selectedPlugin, selectedApp},
      args[0] === 'exit',
    );

    const currentTime = Date.now();
    const usageSummary = computeUsageSummary(state.usageTracking, currentTime);

    store.dispatch(clearTimeline(currentTime));

    logger.track('usage', TIME_SPENT_EVENT, usageSummary.total);
    for (const key of Object.keys(usageSummary.plugin)) {
      const keyParts = deconstructPluginKey(key);
      logger.track(
        'usage',
        TIME_SPENT_EVENT,
        usageSummary.plugin[key],
        keyParts.pluginName,
      );
    }

    Object.entries(state.connections.enabledPlugins).forEach(
      ([app, plugins]) => {
        // TODO: remove "starred-plugns" event in favor of "enabled-plugins" after some transition period
        logger.track('usage', 'starred-plugins', {
          app,
          starredPlugins: plugins,
        });
        logger.track('usage', 'enabled-plugins', {
          app,
          enabledPugins: plugins,
        });
      },
    );

    const bgStats = getPluginBackgroundStats();
    logger.track('usage', 'plugin-stats', {
      cpuTime: bgStats.cpuTime,
      bytesReceived: bgStats.bytesReceived,
    });
    for (const key of Object.keys(bgStats.byPlugin)) {
      const {
        cpuTimeTotal: _a,
        messageCountTotal: _b,
        bytesReceivedTotal: _c,
        ...dataWithoutTotal
      } = bgStats.byPlugin[key];
      if (Object.values(dataWithoutTotal).some((v) => v > 0)) {
        logger.track('usage', 'plugin-stats-plugin', dataWithoutTotal, key);
      }
    }
    resetPluginBackgroundStatsDelta();

    if (
      !state.application.windowIsFocused ||
      !selectedDevice ||
      !selectedPlugin
    ) {
      return;
    }

    let app: string | null = null;
    let sdkVersion: number | null = null;

    if (selectedApp) {
      const client = clients.find((c: Client) => c.id === selectedApp);
      if (client) {
        app = client.query.app;
        sdkVersion = client.query.sdk_version || 0;
      }
    }

    const info = {
      droppedFrames,
      largeFrameDrops,
      os: selectedDevice.os,
      device: selectedDevice.title,
      plugin: selectedPlugin,
      app,
      sdkVersion,
      isForeground: state.application.windowIsFocused,
      usedJSHeapSize: (window.performance as any).memory.usedJSHeapSize,
      cpuLoad: getCPUUsage().percentCPUUsage,
    };

    // reset dropped frames counter
    droppedFrames = 0;
    largeFrameDrops = 0;

    logger.track('usage', 'ping', info);
  });
};

export function computeUsageSummary(
  state: UsageTrackingState,
  currentTime: number,
) {
  const intervals: UsageInterval[] = [];
  let intervalStart = 0;
  let isFocused = false;
  let pluginData: SelectedPluginData | null = null;
  let pluginKey: string | null;

  function startInterval(event: TrackingEvent) {
    intervalStart = event.time;
    if (
      event.type === 'TIMELINE_START' ||
      event.type === 'WINDOW_FOCUS_CHANGE'
    ) {
      isFocused = event.isFocused;
    }
    if (event.type === 'PLUGIN_SELECTED') {
      pluginKey = event.pluginKey;
      pluginData = event.pluginData;
    }
  }
  function endInterval(time: number) {
    const length = time - intervalStart;
    intervals.push({length, focused: isFocused, pluginKey, pluginData});
  }

  for (const event of state.timeline) {
    if (
      event.type === 'TIMELINE_START' ||
      event.type === 'WINDOW_FOCUS_CHANGE' ||
      event.type === 'PLUGIN_SELECTED'
    ) {
      if (event.type !== 'TIMELINE_START') {
        endInterval(event.time);
      }
      startInterval(event);
    }
  }
  endInterval(currentTime);

  return intervals.reduce<UsageSummary>(
    (acc: UsageSummary, x: UsageInterval) =>
      produce(acc, (draft) => {
        draft.total.focusedTime += x.focused ? x.length : 0;
        draft.total.unfocusedTime += x.focused ? 0 : x.length;
        const pluginKey = x.pluginKey ?? getPluginKey(null, null, 'none');
        draft.plugin[pluginKey] = draft.plugin[pluginKey] ?? {
          focusedTime: 0,
          unfocusedTime: 0,
          ...x.pluginData,
        };
        draft.plugin[pluginKey].focusedTime += x.focused ? x.length : 0;
        draft.plugin[pluginKey].unfocusedTime += x.focused ? 0 : x.length;
      }),
    {
      total: {focusedTime: 0, unfocusedTime: 0},
      plugin: {},
    },
  );
}

const flipperExitDataKey = 'FlipperExitData';

interface ExitData {
  lastSeen: string;
  deviceOs: string;
  deviceType: string;
  deviceTitle: string;
  plugin: string;
  app: string;
  cleanExit: boolean;
  pid: number;
}

function loadExitData(): ExitData | undefined {
  if (!window.localStorage) {
    return undefined;
  }
  const data = window.localStorage.getItem(flipperExitDataKey);
  if (data) {
    try {
      const res = JSON.parse(data);
      if (res.cleanExit === undefined) {
        res.cleanExit = true; // avoid skewing results for historical data where this info isn't present
      }
      return res;
    } catch (e) {
      console.warn('Failed to parse flipperExitData', e);
    }
  }
  return undefined;
}

export function persistExitData(
  state: {
    selectedDevice: BaseDevice | null;
    selectedPlugin: string | null;
    selectedApp: string | null;
  },
  cleanExit: boolean,
) {
  if (!window.localStorage) {
    return;
  }
  const exitData: ExitData = {
    lastSeen: '' + Date.now(),
    deviceOs: state.selectedDevice ? state.selectedDevice.os : '',
    deviceType: state.selectedDevice ? state.selectedDevice.deviceType : '',
    deviceTitle: state.selectedDevice ? state.selectedDevice.title : '',
    plugin: state.selectedPlugin || '',
    app: state.selectedApp ? deconstructClientId(state.selectedApp).app : '',
    cleanExit,
    pid: remote.process.pid,
  };
  window.localStorage.setItem(
    flipperExitDataKey,
    JSON.stringify(exitData, null, 2),
  );
}

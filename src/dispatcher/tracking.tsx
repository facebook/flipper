/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ipcRenderer} from 'electron';
import {performance} from 'perf_hooks';
import EventEmitter from 'events';

import {Store} from '../reducers/index';
import {Logger} from '../fb-interfaces/Logger';
import Client from '../Client';
import {
  getPluginBackgroundStats,
  resetPluginBackgroundStatsDelta,
} from '../utils/messageQueue';
import {
  clearTimeline,
  TrackingEvent,
  State as UsageTrackingState,
} from '../reducers/usageTracking';
import produce from 'immer';

const TIME_SPENT_EVENT = 'time-spent';

type UsageInterval = {
  plugin: string | null;
  length: number;
  focused: boolean;
};

export type UsageSummary = {
  total: {focusedTime: number; unfocusedTime: number};
  [pluginName: string]: {focusedTime: number; unfocusedTime: number};
};

export const fpsEmitter = new EventEmitter();

export default (store: Store, logger: Logger) => {
  let droppedFrames: number = 0;
  let largeFrameDrops: number = 0;
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

  ipcRenderer.on('trackUsage', () => {
    const state = store.getState();
    const {
      selectedDevice,
      selectedPlugin,
      selectedApp,
      clients,
    } = state.connections;

    const currentTime = Date.now();
    const usageSummary = computeUsageSummary(state.usageTracking, currentTime);

    store.dispatch(clearTimeline(currentTime));

    logger.track('usage', TIME_SPENT_EVENT, usageSummary.total);
    for (const key of Object.keys(usageSummary)) {
      logger.track('usage', TIME_SPENT_EVENT, usageSummary[key], key);
    }

    Object.entries(state.connections.userStarredPlugins).forEach(
      ([app, plugins]) =>
        logger.track('usage', 'starred-plugins', {
          app: app,
          starredPlugins: plugins,
        }),
    );

    logger.track('usage', 'plugin-stats', getPluginBackgroundStats());
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
  let selectedPlugin: string | null = null;

  function startInterval(event: TrackingEvent) {
    intervalStart = event.time;
    if (
      event.type === 'TIMELINE_START' ||
      event.type === 'WINDOW_FOCUS_CHANGE'
    ) {
      isFocused = event.isFocused;
    }
    if (event.type === 'PLUGIN_SELECTED') {
      selectedPlugin = event.plugin;
    }
  }
  function endInterval(time: number) {
    const length = time - intervalStart;
    intervals.push({length, plugin: selectedPlugin, focused: isFocused});
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
      produce(acc, draft => {
        draft.total.focusedTime += x.focused ? x.length : 0;
        draft.total.unfocusedTime += x.focused ? 0 : x.length;
        const pluginName = x.plugin ?? 'none';
        draft[pluginName] = draft[pluginName] ?? {
          focusedTime: 0,
          unfocusedTime: 0,
        };
        draft[pluginName].focusedTime += x.focused ? x.length : 0;
        draft[pluginName].unfocusedTime += x.focused ? 0 : x.length;
      }),
    {
      total: {focusedTime: 0, unfocusedTime: 0},
    },
  );
}

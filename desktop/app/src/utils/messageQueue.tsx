/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PersistedStateReducer, FlipperDevicePlugin} from '../plugin';
import {State, MiddlewareAPI} from '../reducers/index';
import {setPluginState} from '../reducers/pluginStates';
import {flipperRecorderAddEvent} from './pluginStateRecorder';
import {
  clearMessageQueue,
  queueMessage,
  Message,
} from '../reducers/pluginMessageQueue';
import {Idler, BaseIdler} from './Idler';
import {pluginIsStarred, getSelectedPluginKey} from '../reducers/connections';
import {deconstructPluginKey} from './clientUtils';
import {onBytesReceived} from '../dispatcher/tracking';

const MAX_BACKGROUND_TASK_TIME = 25;

type StatEntry = {
  cpuTimeTotal: number; // Total time spend in persisted Reducer
  cpuTimeDelta: number; // Time spend since previous tracking tick
  messageCountTotal: number; // amount of message received for this plugin
  messageCountDelta: number; // amout of messages received since previous tracking tick
  maxTime: number; // maximum time spend in a single reducer call
  bytesReceivedTotal: number; // Bytes received
  bytesReceivedDelta: number; // Bytes received since last tick
};

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
  byPlugin: {[plugin: string]: StatEntry};
} {
  let cpuTime: number = 0;
  const byPlugin = Array.from(pluginBackgroundStats.entries()).reduce(
    (aggregated, [pluginName, data]) => {
      cpuTime += data.cpuTimeDelta;
      aggregated[pluginName] = data;
      return aggregated;
    },
    {} as {[plugin: string]: StatEntry},
  );
  return {
    cpuTime,
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

function addBackgroundStat(plugin: string, cpuTime: number) {
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

function processMessage(
  state: State,
  pluginKey: string,
  plugin: {
    id: string;
    persistedStateReducer: PersistedStateReducer | null;
  },
  message: {method: string; params?: any},
): State {
  const statName = `${plugin.id}.${message.method}`;
  const reducerStartTime = Date.now();
  flipperRecorderAddEvent(pluginKey, message.method, message.params);
  try {
    const newPluginState = plugin.persistedStateReducer!(
      state,
      message.method,
      message.params,
    );
    addBackgroundStat(statName, Date.now() - reducerStartTime);
    return newPluginState;
  } catch (e) {
    console.error(`Failed to process event for plugin ${plugin.id}`, e);
    return state;
  }
}

export function processMessageImmediately(
  store: MiddlewareAPI,
  pluginKey: string,
  plugin: {
    defaultPersistedState: any;
    id: string;
    persistedStateReducer: PersistedStateReducer | null;
  },
  message: {method: string; params?: any},
) {
  const persistedState = getCurrentPluginState(store, plugin, pluginKey);
  const newPluginState = processMessage(
    persistedState,
    pluginKey,
    plugin,
    message,
  );
  if (persistedState !== newPluginState) {
    store.dispatch(
      setPluginState({
        pluginKey,
        state: newPluginState,
      }),
    );
  }
}

export function processMessageLater(
  store: MiddlewareAPI,
  pluginKey: string,
  plugin: {
    defaultPersistedState: any;
    id: string;
    persistedStateReducer: PersistedStateReducer | null;
    maxQueueSize?: number;
  },
  message: {method: string; params?: any},
) {
  const isSelected =
    pluginKey === getSelectedPluginKey(store.getState().connections);
  switch (true) {
    case plugin.id === 'Navigation': // Navigation events are always processed, to make sure the navbar stays up to date
    case isSelected && getPendingMessages(store, pluginKey).length === 0:
      processMessageImmediately(store, pluginKey, plugin, message);
      break;
    case isSelected:
    case plugin instanceof FlipperDevicePlugin:
    case pluginIsStarred(
      store.getState().connections.userStarredPlugins,
      deconstructPluginKey(pluginKey).client,
      plugin.id,
    ):
      store.dispatch(
        queueMessage(
          pluginKey,
          message.method,
          message.params,
          plugin.maxQueueSize,
        ),
      );
      break;
    // In all other cases, messages will be dropped...
  }
}

export async function processMessageQueue(
  plugin: {
    defaultPersistedState: any;
    id: string;
    persistedStateReducer: PersistedStateReducer | null;
  },
  pluginKey: string,
  store: MiddlewareAPI,
  progressCallback?: (progress: {current: number; total: number}) => void,
  idler: BaseIdler = new Idler(),
): Promise<boolean> {
  if (!plugin.persistedStateReducer) {
    return true;
  }
  const total = getPendingMessages(store, pluginKey).length;
  let progress = 0;
  do {
    const messages = getPendingMessages(store, pluginKey);
    if (!messages.length) {
      break;
    }
    // there are messages to process! lets do so until we have to idle
    const persistedState = getCurrentPluginState(store, plugin, pluginKey);
    let offset = 0;
    let newPluginState = persistedState;
    do {
      newPluginState = processMessage(
        newPluginState,
        pluginKey,
        plugin,
        messages[offset],
      );
      offset++;
      progress++;

      progressCallback?.({
        total: Math.max(total, progress),
        current: progress,
      });
    } while (offset < messages.length && !idler.shouldIdle());
    // save progress
    // by writing progress away first and then idling, we make sure this logic is
    // resistent to kicking off this process twice; grabbing, processing messages, saving state is done synchronosly
    // until the idler has to break
    store.dispatch(clearMessageQueue(pluginKey, offset));
    if (newPluginState !== persistedState) {
      store.dispatch(
        setPluginState({
          pluginKey,
          state: newPluginState,
        }),
      );
    }

    if (idler.isCancelled()) {
      return false;
    }

    await idler.idle();
    // new messages might have arrived, so keep looping
  } while (getPendingMessages(store, pluginKey).length);
  return true;
}

function getPendingMessages(
  store: MiddlewareAPI,
  pluginKey: string,
): Message[] {
  return store.getState().pluginMessageQueue[pluginKey] || [];
}

function getCurrentPluginState(
  store: MiddlewareAPI,
  plugin: {defaultPersistedState: any},
  pluginKey: string,
) {
  // possible optimization: don't spread default state here by put proper default state when initializing clients
  return {
    ...plugin.defaultPersistedState,
    ...store.getState().pluginStates[pluginKey],
  };
}

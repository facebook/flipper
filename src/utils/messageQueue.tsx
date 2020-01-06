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

const MAX_BACKGROUND_TASK_TIME = 25;

type StatEntry = {
  cpuTime: number; // Total time spend in persisted Reducer
  messages: number; // amount of message received for this plugin
  maxTime: number; // maximum time spend in a single reducer call
};

const pluginBackgroundStats = new Map<string, StatEntry>();

export function getPluginBackgroundStats(): {[plugin: string]: StatEntry} {
  return Array.from(Object.entries(pluginBackgroundStats)).reduce(
    (aggregated, [pluginName, data]) => {
      aggregated[pluginName] = data;
      return aggregated;
    },
    {} as {[plugin: string]: StatEntry},
  );
}

if (window) {
  // @ts-ignore
  window.flipperPrintPluginBackgroundStats = () => {
    console.table(
      Array.from(pluginBackgroundStats.entries()).map(
        ([plugin, {cpuTime, messages, maxTime}]) => ({
          plugin,
          cpuTime,
          messages,
          maxTime,
        }),
      ),
    );
  };
}

function addBackgroundStat(plugin: string, cpuTime: number) {
  if (!pluginBackgroundStats.has(plugin)) {
    pluginBackgroundStats.set(plugin, {cpuTime: 0, messages: 0, maxTime: 0});
  }
  const stat = pluginBackgroundStats.get(plugin)!;
  stat.cpuTime += cpuTime;
  stat.messages += 1;
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
  const persistedState: any =
    store.getState().pluginStates[pluginKey] ??
    plugin.defaultPersistedState ??
    {};
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
    case isSelected && getPendingMessages(store, pluginKey).length === 0:
      processMessageImmediately(store, pluginKey, plugin, message);
      break;
    case isSelected:
    case plugin instanceof FlipperDevicePlugin:
    case pluginIsStarred(store.getState().connections, plugin.id):
      store.dispatch(
        queueMessage(
          pluginKey,
          message.method,
          message.params,
          plugin.maxQueueSize,
        ),
      );
      break;
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
) {
  if (!plugin.persistedStateReducer) {
    return;
  }
  const total = getPendingMessages(store, pluginKey).length;
  let progress = 0;
  do {
    const messages = getPendingMessages(store, pluginKey);
    if (!messages.length) {
      break;
    }
    // there are messages to process! lets do so until we have to idle
    const persistedState =
      store.getState().pluginStates[pluginKey] ??
      plugin.defaultPersistedState ??
      {};
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
      return;
    }

    await idler.idle();
    // new messages might have arrived, so keep looping
  } while (getPendingMessages(store, pluginKey).length);
}

function getPendingMessages(
  store: MiddlewareAPI,
  pluginKey: string,
): Message[] {
  return store.getState().pluginMessageQueue[pluginKey] || [];
}

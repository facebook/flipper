/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PersistedStateReducer} from '../plugin';
import {Store, State} from '../reducers/index';
import {setPluginState} from '../reducers/pluginStates';
import {flipperRecorderAddEvent} from './pluginStateRecorder';
import {
  clearMessageQueue,
  queueMessage,
  Message,
} from '../reducers/pluginMessageQueue';
import {Idler, BaseIdler} from './Idler';
import Client from '../Client';
import {getPluginKey} from './pluginUtils';

const MAX_BACKGROUND_TASK_TIME = 25;

const pluginBackgroundStats = new Map<
  string,
  {
    cpuTime: number; // Total time spend in persisted Reducer
    messages: number; // amount of message received for this plugin
    maxTime: number; // maximum time spend in a single reducer call
  }
>();

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
    name: string;
    persistedStateReducer: PersistedStateReducer | null;
  },
  message: {method: string; params?: any},
): State {
  const statName = `${plugin.name}.${message.method}`;
  const reducerStartTime = Date.now();
  flipperRecorderAddEvent(pluginKey, message.method, message.params);
  const newPluginState = plugin.persistedStateReducer!(
    state,
    message.method,
    message.params,
  );
  addBackgroundStat(statName, Date.now() - reducerStartTime);
  return newPluginState;
}

export function processMessageImmediately(
  store: Store,
  pluginKey: string,
  plugin: {
    defaultPersistedState: any;
    name: string;
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
  store: Store,
  pluginKey: string,
  plugin: {
    defaultPersistedState: any;
    name: string;
    persistedStateReducer: PersistedStateReducer | null;
  },
  message: {method: string; params?: any},
) {
  // TODO: can we make this better?
  const selection = store.getState().connections;
  const selectedPlugin =
    selection.selectedPlugin &&
    getPluginKey(
      selection.selectedApp,
      selection.selectedDevice,
      selection.selectedPlugin,
    );
  // if the plugin is active, and has no queued messaged, process the message immediately
  if (
    selectedPlugin === pluginKey &&
    getMessages(store, pluginKey).length === 0
  ) {
    processMessageImmediately(store, pluginKey, plugin, message);
  } else {
    // TODO: possible optimization: drop all messages for non-favorited plugins
    // TODO: possible optimization: drop messages if queue is too large
    store.dispatch(queueMessage(pluginKey, message.method, message.params));
  }
}

export async function processMessageQueue(
  client: Client,
  plugin: {
    defaultPersistedState: any;
    name: string;
    persistedStateReducer: PersistedStateReducer;
  },
  pluginKey: string,
  store: Store,
  progressCallback?: (progress: string) => void,
  idler: BaseIdler = new Idler(),
) {
  const total = getMessages(store, pluginKey).length;
  let progress = 0;
  do {
    const messages = getMessages(store, pluginKey);
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
      newPluginState = plugin.persistedStateReducer!(
        newPluginState,
        messages[offset].method,
        messages[offset].params,
      );
      offset++;
      progress++;

      progressCallback?.(
        `Processing events ${progress} / ${Math.max(
          total,
          progress,
        )} (${Math.min(100, 100 * (progress / total))}%)`,
      );
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
  } while (getMessages(store, pluginKey).length);
}

function getMessages(store: Store, pluginKey: string): Message[] {
  return store.getState().pluginMessageQueue[pluginKey] || [];
}

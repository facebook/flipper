/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  PersistedStateReducer,
  FlipperDevicePlugin,
  isSandyPlugin,
} from '../plugin';
import {State, MiddlewareAPI} from '../reducers/index';
import {setPluginState} from '../reducers/pluginStates';
import {flipperRecorderAddEvent} from './pluginStateRecorder';
import {
  clearMessageQueue,
  queueMessages,
  Message,
} from '../reducers/pluginMessageQueue';
import {Idler, BaseIdler} from './Idler';
import {pluginIsStarred, getSelectedPluginKey} from '../reducers/connections';
import {deconstructPluginKey} from './clientUtils';
import {defaultEnabledBackgroundPlugins} from './pluginUtils';
import {SandyPluginDefinition} from 'flipper-plugin';
import {addBackgroundStat} from './pluginStats';

function processMessage(
  state: State,
  pluginKey: string,
  plugin: {
    id: string;
    persistedStateReducer: PersistedStateReducer | null;
  },
  message: Message,
): State {
  const reducerStartTime = Date.now();
  flipperRecorderAddEvent(pluginKey, message.method, message.params);
  try {
    const newPluginState = plugin.persistedStateReducer!(
      state,
      message.method,
      message.params,
    );
    addBackgroundStat(plugin.id, Date.now() - reducerStartTime);
    return newPluginState;
  } catch (e) {
    console.error(`Failed to process event for plugin ${plugin.id}`, e);
    return state;
  }
}

export function processMessagesImmediately(
  store: MiddlewareAPI,
  pluginKey: string,
  plugin: {
    defaultPersistedState: any;
    id: string;
    persistedStateReducer: PersistedStateReducer | null;
  },
  messages: Message[],
) {
  const persistedState = getCurrentPluginState(store, plugin, pluginKey);
  const newPluginState = messages.reduce(
    (state, message) => processMessage(state, pluginKey, plugin, message),
    persistedState,
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

export function processMessagesLater(
  store: MiddlewareAPI,
  pluginKey: string,
  plugin:
    | {
        defaultPersistedState: any;
        id: string;
        persistedStateReducer: PersistedStateReducer | null;
        maxQueueSize?: number;
      }
    | SandyPluginDefinition,
  messages: Message[],
) {
  // @ts-ignore
  if (isSandyPlugin(plugin)) {
    // TODO:
    throw new Error(
      'Receiving messages is not yet supported for Sandy plugins',
    );
  }
  const isSelected =
    pluginKey === getSelectedPluginKey(store.getState().connections);
  switch (true) {
    case plugin.id === 'Navigation': // Navigation events are always processed, to make sure the navbar stays up to date
    case isSelected && getPendingMessages(store, pluginKey).length === 0:
      processMessagesImmediately(store, pluginKey, plugin, messages);
      break;
    case isSelected:
    case plugin instanceof FlipperDevicePlugin:
    case (plugin as any).prototype instanceof FlipperDevicePlugin:
    case pluginIsStarred(
      store.getState().connections.userStarredPlugins,
      deconstructPluginKey(pluginKey).client,
      plugin.id,
    ):
      store.dispatch(queueMessages(pluginKey, messages, plugin.maxQueueSize));
      break;
    default:
      // In all other cases, messages will be dropped...
      if (!defaultEnabledBackgroundPlugins.includes(plugin.id))
        console.warn(
          `Received message for disabled plugin ${plugin.id}, dropping..`,
        );
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

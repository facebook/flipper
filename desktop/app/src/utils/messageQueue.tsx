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
import {
  flipperRecorderAddEvent,
  isRecordingEvents,
} from './pluginStateRecorder';
import {
  clearMessageQueue,
  queueMessages,
  Message,
  DEFAULT_MAX_QUEUE_SIZE,
} from '../reducers/pluginMessageQueue';
import {Idler, BaseIdler} from './Idler';
import {pluginIsStarred, getSelectedPluginKey} from '../reducers/connections';
import {deconstructPluginKey} from './clientUtils';
import {defaultEnabledBackgroundPlugins} from './pluginUtils';
import {SandyPluginInstance} from 'flipper-plugin';
import {addBackgroundStat} from './pluginStats';

function processMessageClassic(
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

function processMessagesSandy(
  pluginKey: string,
  plugin: SandyPluginInstance,
  messages: Message[],
) {
  const reducerStartTime = Date.now();
  if (isRecordingEvents(pluginKey)) {
    messages.forEach((message) => {
      flipperRecorderAddEvent(pluginKey, message.method, message.params);
    });
  }
  try {
    plugin.receiveMessages(messages);
    addBackgroundStat(plugin.definition.id, Date.now() - reducerStartTime);
  } catch (e) {
    console.error(
      `Failed to process event for plugin ${plugin.definition.id}`,
      e,
    );
  }
}

export function processMessagesImmediately(
  store: MiddlewareAPI,
  pluginKey: string,
  plugin:
    | {
        defaultPersistedState: any;
        id: string;
        persistedStateReducer: PersistedStateReducer | null;
      }
    | SandyPluginInstance,
  messages: Message[],
) {
  if (plugin instanceof SandyPluginInstance) {
    processMessagesSandy(pluginKey, plugin, messages);
  } else {
    const persistedState = getCurrentPluginState(store, plugin, pluginKey);
    const newPluginState = messages.reduce(
      (state, message) =>
        processMessageClassic(state, pluginKey, plugin, message),
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
    | SandyPluginInstance,
  messages: Message[],
) {
  const pluginId =
    plugin instanceof SandyPluginInstance ? plugin.definition.id : plugin.id;
  const isSelected =
    pluginKey === getSelectedPluginKey(store.getState().connections);
  switch (true) {
    // Navigation events are always processed immediately, to make sure the navbar stays up to date, see also T69991064
    case pluginId === 'Navigation':
    case isSelected && getPendingMessages(store, pluginKey).length === 0:
      processMessagesImmediately(store, pluginKey, plugin, messages);
      break;
    case isSelected:
    case plugin instanceof SandyPluginInstance:
    case plugin instanceof FlipperDevicePlugin:
    case (plugin as any).prototype instanceof FlipperDevicePlugin:
    case pluginIsStarred(
      store.getState().connections.userStarredPlugins,
      deconstructPluginKey(pluginKey).client,
      pluginId,
    ):
      store.dispatch(
        queueMessages(
          pluginKey,
          messages,
          plugin instanceof SandyPluginInstance
            ? DEFAULT_MAX_QUEUE_SIZE
            : plugin.maxQueueSize,
        ),
      );
      break;
    default:
      // In all other cases, messages will be dropped...
      if (!defaultEnabledBackgroundPlugins.includes(pluginId))
        console.warn(
          `Received message for disabled plugin ${pluginId}, dropping..`,
        );
  }
}

export async function processMessageQueue(
  plugin:
    | {
        defaultPersistedState: any;
        id: string;
        persistedStateReducer: PersistedStateReducer | null;
      }
    | SandyPluginInstance,
  pluginKey: string,
  store: MiddlewareAPI,
  progressCallback?: (progress: {current: number; total: number}) => void,
  idler: BaseIdler = new Idler(),
): Promise<boolean> {
  if (!SandyPluginInstance.is(plugin) && !plugin.persistedStateReducer) {
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
    // persistedState is irrelevant for SandyPlugins, as they store state locally
    const persistedState = SandyPluginInstance.is(plugin)
      ? undefined
      : getCurrentPluginState(store, plugin, pluginKey);
    let offset = 0;
    let newPluginState = persistedState;
    do {
      if (SandyPluginInstance.is(plugin)) {
        // Optimization: we could send a batch of messages here
        processMessagesSandy(pluginKey, plugin, [messages[offset]]);
      } else {
        newPluginState = processMessageClassic(
          newPluginState,
          pluginKey,
          plugin,
          messages[offset],
        );
      }
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
    if (!SandyPluginInstance.is(plugin) && newPluginState !== persistedState) {
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

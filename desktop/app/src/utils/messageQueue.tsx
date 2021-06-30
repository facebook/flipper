/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperDevicePlugin} from '../plugin';
import type {MiddlewareAPI} from '../reducers/index';
import {
  clearMessageQueue,
  queueMessages,
  Message,
  DEFAULT_MAX_QUEUE_SIZE,
} from '../reducers/pluginMessageQueue';
import {IdlerImpl} from './Idler';
import {isPluginEnabled, getSelectedPluginKey} from '../reducers/connections';
import {deconstructPluginKey} from './clientUtils';
import {defaultEnabledBackgroundPlugins} from './pluginUtils';
import {batch, Idler, _SandyPluginInstance} from 'flipper-plugin';
import {addBackgroundStat} from './pluginStats';

function processMessagesImmediately(
  plugin: _SandyPluginInstance,
  messages: Message[],
) {
  const reducerStartTime = Date.now();
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

export function processMessagesLater(
  store: MiddlewareAPI,
  pluginKey: string,
  plugin: _SandyPluginInstance,
  messages: Message[],
) {
  const pluginId = plugin.definition.id;
  const isSelected =
    pluginKey === getSelectedPluginKey(store.getState().connections);
  switch (true) {
    // Navigation events are always processed immediately, to make sure the navbar stays up to date, see also T69991064
    case pluginId === 'Navigation':
    case isSelected && getPendingMessages(store, pluginKey).length === 0:
      processMessagesImmediately(plugin, messages);
      break;
    case isSelected:
    case plugin instanceof _SandyPluginInstance:
    case plugin instanceof FlipperDevicePlugin:
    case (plugin as any).prototype instanceof FlipperDevicePlugin:
    case isPluginEnabled(
      store.getState().connections.enabledPlugins,
      store.getState().connections.enabledDevicePlugins,
      deconstructPluginKey(pluginKey).client,
      pluginId,
    ):
      store.dispatch(
        queueMessages(pluginKey, messages, DEFAULT_MAX_QUEUE_SIZE),
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
  plugin: _SandyPluginInstance,
  pluginKey: string,
  store: MiddlewareAPI,
  progressCallback?: (progress: {current: number; total: number}) => void,
  idler: Idler = new IdlerImpl(),
): Promise<boolean> {
  const total = getPendingMessages(store, pluginKey).length;
  let progress = 0;
  do {
    const messages = getPendingMessages(store, pluginKey);
    if (!messages.length) {
      break;
    }
    // there are messages to process! lets do so until we have to idle
    let offset = 0;
    batch(() => {
      do {
        // Optimization: we could send a batch of messages here
        processMessagesImmediately(plugin, [messages[offset]]);
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
    });

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

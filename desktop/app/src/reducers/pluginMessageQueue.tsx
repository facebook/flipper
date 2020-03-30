/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import produce from 'immer';
import {deconstructPluginKey} from '../utils/clientUtils';

export const DEFAULT_MAX_QUEUE_SIZE = 10000;

export type Message = {
  method: string;
  params: any;
};

export type State = {
  [pluginKey: string]: Message[];
};

export type Action =
  | {
      type: 'QUEUE_MESSAGE';
      payload: {
        pluginKey: string; // client + plugin
        maxQueueSize: number;
      } & Message;
    }
  | {
      type: 'CLEAR_MESSAGE_QUEUE';
      payload: {
        pluginKey: string; // client + plugin
        amount: number;
      };
    }
  | {
      type: 'CLEAR_PLUGIN_STATE';
      payload: {clientId: string; devicePlugins: Set<string>};
    };

const INITIAL_STATE: State = {};

export default function reducer(
  state: State | undefined = INITIAL_STATE,
  action: Action,
): State {
  switch (action.type) {
    case 'QUEUE_MESSAGE': {
      const {pluginKey, method, params, maxQueueSize} = action.payload;
      // this is hit very often, so try to do it a bit optimal
      const currentMessages = state[pluginKey] || [];
      const newMessages =
        currentMessages.length < maxQueueSize
          ? currentMessages.slice()
          : // throw away first 10% of the queue if it gets too full
            (console.log(`Dropping events for plugin ${pluginKey}`),
            currentMessages.slice(Math.floor(maxQueueSize / 10)));
      newMessages.push({method, params});
      return {
        ...state,
        [pluginKey]: newMessages,
      };
    }

    case 'CLEAR_MESSAGE_QUEUE': {
      const {pluginKey, amount} = action.payload;
      return produce(state, (draft) => {
        const messages = draft[pluginKey];
        if (messages) {
          messages.splice(0, amount);
        }
      });
    }

    case 'CLEAR_PLUGIN_STATE': {
      const {payload} = action;
      return Object.keys(state).reduce((newState: State, pluginKey) => {
        // Only add the pluginState, if its from a plugin other than the one that
        // was removed. pluginKeys are in the form of ${clientID}#${pluginID}.
        const plugin = deconstructPluginKey(pluginKey);
        const clientId = plugin.client;
        const pluginId = plugin.pluginName;
        if (
          clientId !== payload.clientId ||
          (pluginId && payload.devicePlugins.has(pluginId))
        ) {
          newState[pluginKey] = state[pluginKey];
        }
        return newState;
      }, {});
    }
    default:
      return state;
  }
}

export const queueMessage = (
  pluginKey: string,
  method: string,
  params: any,
  maxQueueSize: number | undefined,
): Action => ({
  type: 'QUEUE_MESSAGE',
  payload: {
    pluginKey,
    method,
    params,
    maxQueueSize: maxQueueSize || DEFAULT_MAX_QUEUE_SIZE,
  },
});

export const clearMessageQueue = (
  pluginKey: string,
  amount: number,
): Action => ({
  type: 'CLEAR_MESSAGE_QUEUE',
  payload: {pluginKey, amount},
});

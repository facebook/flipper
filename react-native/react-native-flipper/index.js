/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// $FlowFixMe
import {NativeModules, NativeEventEmitter} from 'react-native';

const {Flipper} = NativeModules;

export default Flipper;

const listeners = {}; // plugin#method -> callback
const plugins = {}; // plugin -> Plugin

class Connection {
  connected;
  pluginId;

  constructor(pluginId) {
    this.connected = false;
    this.pluginId = pluginId;
  }

  send(method, data) {
    if (!this.connected) {
      throw new Error('Cannot send data, not connected');
    }
    Flipper.send(this.pluginId, method, JSON.stringify(data));
  }

  reportErrorWithMetadata(reason, stackTrace) {
    Flipper.reportErrorWithMetadata(this.pluginId, reason, stackTrace);
  }

  reportError(error) {
    Flipper.reportError(this.pluginId, error);
  }

  receive(method, listener) {
    if (!this.connected) {
      throw new Error('Cannot receive data, not connected');
    }

    listeners[this.pluginId + '#' + method] = listener;
    Flipper.subscribe(this.pluginId, method);
  }
}

class Responder {
  responderId;

  constructor(responderId) {
    this.responderId = responderId;
  }

  success(response) {
    Flipper.respondSuccess(
      this.responderId,
      response == null ? null : JSON.stringify(response),
    );
  }

  error(response) {
    Flipper.respondError(this.responderId, JSON.stringify(response));
  }
}

function startEventListeners() {
  const emitter = new NativeEventEmitter(Flipper);
  emitter.removeAllListeners('react-native-flipper-plugin-connect');
  emitter.removeAllListeners('react-native-flipper-plugin-disconnect');
  emitter.removeAllListeners('react-native-flipper-receive-event');

  emitter.addListener('react-native-flipper-plugin-connect', event => {
    const {plugin} = event;
    if (plugins[plugin]) {
      const p = plugins[plugin];
      p._connection.connected = true;
      p.onConnect(p._connection);
    }
  });

  emitter.addListener('react-native-flipper-plugin-disconnect', event => {
    const {plugin} = event;
    if (plugins[plugin]) {
      const p = plugins[plugin];
      p._connection.connected = false;
      p.onDisconnect();
    }
  });

  emitter.addListener('react-native-flipper-receive-event', event => {
    const {plugin, method, params, responderId} = event;
    const key = plugin + '#' + method;
    if (listeners[key]) {
      const responder = new Responder(responderId);
      listeners[key](JSON.parse(params), responder);
    }
  });
}

// $FlowFixMe
export function addPlugin(plugin) {
  if (!plugin || typeof plugin !== 'object') {
    throw new Error('Expected plugin, got ' + plugin);
  }
  ['getId', 'onConnect', 'onDisconnect'].forEach(method => {
    if (typeof plugin[method] !== 'function') {
      throw new Error(`Plugin misses an implementation for '${method}'`);
    }
  });
  const runInBackground =
    typeof plugin.runInBackground === 'function'
      ? !!plugin.runInBackground()
      : false;
  const id = plugin.getId();
  plugin._connection = new Connection(id);
  plugins[id] = plugin;

  Flipper.registerPlugin(id, runInBackground);
}

startEventListeners();

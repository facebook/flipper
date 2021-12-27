/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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

function assertSerializable(data) {
  if (
    data === undefined ||
    Array.isArray(data) ||
    (data && typeof data === 'object')
  ) {
    return true;
  }
  throw new Error(
    'Flipper: Expected serializable (undefined, an array or an object). Got: ' +
      data,
  );
}

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
    assertSerializable(data);
    Flipper.send(this.pluginId, method, JSON.stringify(data));
  }

  reportErrorWithMetadata(reason, stackTrace) {
    Flipper.reportErrorWithMetadata(
      this.pluginId,
      '' + reason,
      '' + stackTrace,
    );
  }

  reportError(error) {
    Flipper.reportError(this.pluginId, '' + error);
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
    assertSerializable(response);
    Flipper.respondSuccess(
      this.responderId,
      response == null ? null : JSON.stringify(response),
    );
  }

  error(response) {
    assertSerializable(response);
    Flipper.respondError(this.responderId, JSON.stringify(response));
  }
}

function startEventListeners() {
  const emitter = new NativeEventEmitter(Flipper);

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
      const responder =
        responderId != null ? new Responder(responderId) : undefined;
      listeners[key](JSON.parse(params), responder);
    }
  });
}

// $FlowFixMe
export function addPlugin(plugin) {
  if (!Flipper) {
    printNoFlipperWarning();
    return;
  }
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

  Flipper.registerPlugin(id, runInBackground, status => {
    if (status === 'noflipper') {
      printNoFlipperWarning();
    }
  });
}

function printNoFlipperWarning() {
  // $FlowFixMe
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(
      'The native module for Flipper seems unavailable. Please verify that `react-native-flipper` is installed as yarn dependency to your project and, for iOS, that `pod install` is run in the `ios` directory.',
    );
  }
}

if (Flipper) {
  startEventListeners();
}

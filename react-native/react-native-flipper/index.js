/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// $FlowFixMe
import {NativeModules} from 'react-native';

const {Flipper} = NativeModules;

export default Flipper;

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
    Flipper.subscribe(this.pluginId, method, (data, responderId) => {
      const responder = new Responder(responderId);
      listener(JSON.parse(data), responder);
    });
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
  const connection = new Connection(id);

  Flipper.registerPlugin(
    id,
    runInBackground,
    function onConnect() {
      connection.connected = true;
      plugin.onConnect(connection);
    },
    function onDisconnect() {
      connection.connected = false;
      plugin.onDisconnect();
    },
  );
}

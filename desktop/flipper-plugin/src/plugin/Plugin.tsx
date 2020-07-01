/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {SandyPluginDefinition} from './SandyPluginDefinition';
import {EventEmitter} from 'events';

type EventsContract = Record<string, any>;
type MethodsContract = Record<string, (params: any) => Promise<any>>;

/**
 * API available to a plugin factory
 */
export interface FlipperClient<
  Events extends EventsContract = {},
  Methods extends MethodsContract = {}
> {
  /**
   * the onDestroy event is fired whenever a client is unloaded from Flipper, or a plugin is disabled.
   */
  onDestroy(cb: () => void): void;

  /**
   * the onConnect event is fired whenever the plugin is connected to it's counter part on the device.
   * For most plugins this event is fired if the user selects the plugin,
   * for background plugins when the initial connection is made.
   */
  onConnect(cb: () => void): void;

  /**
   * The counterpart of the `onConnect` handler.
   * Will also be fired before the plugin is cleaned up if the connection is currently active:
   * - when the client disconnects
   * - when the plugin is disabled
   */
  onDisconnect(cb: () => void): void;
}

/**
 * Internal API exposed by Flipper, and wrapped by FlipperPluginInstance to be passed to the
 * Plugin Factory. For internal purposes only
 */
interface RealFlipperClient {
  isBackgroundPlugin(pluginId: string): boolean;
  initPlugin(pluginId: string): void;
  deinitPlugin(pluginId: string): void;
}

export type FlipperPluginFactory<
  Events extends EventsContract,
  Methods extends MethodsContract
> = (client: FlipperClient<Events, Methods>) => object;

export type FlipperPluginComponent = React.FC<{}>;

export class SandyPluginInstance {
  /** base client provided by Flipper */
  realClient: RealFlipperClient;
  /** client that is bound to this instance */
  client: FlipperClient<any, any>;
  /** the original plugin definition */
  definition: SandyPluginDefinition;
  /** the plugin instance api as used inside components and such  */
  instanceApi: any;

  connected = false;
  events = new EventEmitter();

  constructor(
    realClient: RealFlipperClient,
    definition: SandyPluginDefinition,
  ) {
    this.realClient = realClient;
    this.definition = definition;
    this.client = {
      onDestroy: (cb) => {
        this.events.on('destroy', cb);
      },
      onConnect: (cb) => {
        this.events.on('connect', cb);
      },
      onDisconnect: (cb) => {
        this.events.on('disconnect', cb);
      },
    };
    this.instanceApi = definition.module.plugin(this.client);
  }

  // the plugin is selected in the UI
  activate() {
    const pluginId = this.definition.id;
    if (!this.realClient.isBackgroundPlugin(pluginId)) {
      this.realClient.initPlugin(pluginId); // will call connect() if needed
    }
  }

  // the plugin is deselected in the UI
  deactivate() {
    const pluginId = this.definition.id;
    if (!this.realClient.isBackgroundPlugin(pluginId)) {
      this.realClient.deinitPlugin(pluginId);
    }
  }

  connect() {
    if (!this.connected) {
      this.connected = true;
      this.events.emit('connect');
    }
  }

  disconnect() {
    if (this.connected) {
      this.connected = false;
      this.events.emit('disconnect');
    }
  }

  destroy() {
    this.disconnect();
    this.events.emit('destroy');
  }

  toJSON() {
    // TODO: T68683449
  }
}

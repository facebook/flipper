/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {SandyPluginDefinition} from './SandyPluginDefinition';
import {BasePluginInstance, BasePluginClient} from './PluginBase';

type EventsContract = Record<string, any>;
type MethodsContract = Record<string, (params: any) => Promise<any>>;

type Message = {
  method: string;
  params?: any;
};

/**
 * API available to a plugin factory
 */
export interface PluginClient<
  Events extends EventsContract = {},
  Methods extends MethodsContract = {}
> extends BasePluginClient {
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

  /**
   * Send a message to the connected client
   */
  send<Method extends keyof Methods>(
    method: Method,
    params: Parameters<Methods[Method]>[0],
  ): ReturnType<Methods[Method]>;

  /**
   * Subscribe to a specific event arriving from the device.
   *
   * Messages can only arrive if the plugin is enabled and connected.
   * For background plugins messages will be batched and arrive the next time the plugin is connected.
   */
  onMessage<Event extends keyof Events>(
    event: Event,
    callback: (params: Events[Event]) => void,
  ): void;
}

/**
 * Internal API exposed by Flipper, and wrapped by FlipperPluginInstance to be passed to the
 * Plugin Factory. For internal purposes only
 */
export interface RealFlipperClient {
  isBackgroundPlugin(pluginId: string): boolean;
  initPlugin(pluginId: string): void;
  deinitPlugin(pluginId: string): void;
  call(
    api: string,
    method: string,
    fromPlugin: boolean,
    params?: Object,
  ): Promise<Object>;
}

export type PluginFactory<
  Events extends EventsContract,
  Methods extends MethodsContract
> = (client: PluginClient<Events, Methods>) => object;

export type FlipperPluginComponent = React.FC<{}>;

export class SandyPluginInstance extends BasePluginInstance {
  static is(thing: any): thing is SandyPluginInstance {
    return thing instanceof SandyPluginInstance;
  }

  /** base client provided by Flipper */
  realClient: RealFlipperClient;
  /** client that is bound to this instance */
  client: PluginClient<any, any>;
  /** connection alive? */
  connected = false;

  constructor(
    realClient: RealFlipperClient,
    definition: SandyPluginDefinition,
    initialStates?: Record<string, any>,
  ) {
    super(definition, initialStates);
    this.realClient = realClient;
    this.definition = definition;
    this.client = {
      ...this.createBasePluginClient(),
      onConnect: (cb) => {
        this.events.on('connect', cb);
      },
      onDisconnect: (cb) => {
        this.events.on('disconnect', cb);
      },
      send: async (method, params) => {
        this.assertConnected();
        return await realClient.call(
          this.definition.id,
          method as any,
          true,
          params as any,
        );
      },
      onMessage: (event, callback) => {
        this.events.on('event-' + event, callback);
      },
    };
    this.initializePlugin(() =>
      definition.asPluginModule().plugin(this.client),
    );
  }

  // the plugin is selected in the UI
  activate() {
    super.activate();
    const pluginId = this.definition.id;
    if (!this.connected && !this.realClient.isBackgroundPlugin(pluginId)) {
      this.realClient.initPlugin(pluginId); // will call connect() if needed
    }
  }

  // the plugin is deselected in the UI
  deactivate() {
    super.deactivate();
    const pluginId = this.definition.id;
    if (this.connected && !this.realClient.isBackgroundPlugin(pluginId)) {
      this.realClient.deinitPlugin(pluginId);
    }
  }

  connect() {
    this.assertNotDestroyed();
    if (!this.connected) {
      this.connected = true;
      this.events.emit('connect');
    }
  }

  disconnect() {
    this.assertNotDestroyed();
    if (this.connected) {
      this.connected = false;
      this.events.emit('disconnect');
    }
  }

  destroy() {
    if (this.connected) {
      this.realClient.deinitPlugin(this.definition.id);
    }
    super.destroy();
  }

  receiveMessages(messages: Message[]) {
    messages.forEach((message) => {
      this.events.emit('event-' + message.method, message.params);
    });
  }

  toJSON() {
    return '[SandyPluginInstance]';
  }

  private assertConnected() {
    this.assertNotDestroyed();
    if (!this.connected) {
      throw new Error('Plugin is not connected');
    }
  }
}

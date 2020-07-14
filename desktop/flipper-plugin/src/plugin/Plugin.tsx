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
import {Atom} from '../state/atom';

type EventsContract = Record<string, any>;
type MethodsContract = Record<string, (params: any) => Promise<any>>;

type Message = {
  method: string;
  params?: any;
};

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

export type FlipperPluginFactory<
  Events extends EventsContract,
  Methods extends MethodsContract
> = (client: FlipperClient<Events, Methods>) => object;

export type FlipperPluginComponent = React.FC<{}>;

export let currentPluginInstance: SandyPluginInstance | undefined = undefined;

export class SandyPluginInstance {
  static is(thing: any): thing is SandyPluginInstance {
    return thing instanceof SandyPluginInstance;
  }

  /** base client provided by Flipper */
  realClient: RealFlipperClient;
  /** client that is bound to this instance */
  client: FlipperClient<any, any>;
  /** the original plugin definition */
  definition: SandyPluginDefinition;
  /** the plugin instance api as used inside components and such  */
  instanceApi: any;

  connected = false;
  destroyed = false;
  events = new EventEmitter();

  // temporarily field that is used during deserialization
  initialStates?: Record<string, any>;
  // all the atoms that should be serialized when making an export / import
  rootStates: Record<string, Atom<any>> = {};

  constructor(
    realClient: RealFlipperClient,
    definition: SandyPluginDefinition,
    initialStates?: Record<string, any>,
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
    currentPluginInstance = this;
    this.initialStates = initialStates;
    try {
      this.instanceApi = definition.module.plugin(this.client);
    } finally {
      this.initialStates = undefined;
      currentPluginInstance = undefined;
    }
  }

  // the plugin is selected in the UI
  activate() {
    this.assertNotDestroyed();
    const pluginId = this.definition.id;
    if (!this.realClient.isBackgroundPlugin(pluginId)) {
      this.realClient.initPlugin(pluginId); // will call connect() if needed
    }
  }

  // the plugin is deselected in the UI
  deactivate() {
    if (this.destroyed) {
      // this can happen if the plugin is disabled while active in the UI.
      // In that case deinit & destroy is already triggered from the STAR_PLUGIN action
      return;
    }
    const pluginId = this.definition.id;
    if (!this.realClient.isBackgroundPlugin(pluginId)) {
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
    this.assertNotDestroyed();
    if (this.connected) {
      this.realClient.deinitPlugin(this.definition.id);
    }
    this.events.emit('destroy');
    this.destroyed = true;
  }

  receiveMessages(messages: Message[]) {
    messages.forEach((message) => {
      this.events.emit('event-' + message.method, message.params);
    });
  }

  toJSON() {
    return '[SandyPluginInstance]';
  }

  exportState() {
    return Object.fromEntries(
      Object.entries(this.rootStates).map(([key, atom]) => [key, atom.get()]),
    );
  }

  isPersistable(): boolean {
    return Object.keys(this.rootStates).length > 0;
  }

  private assertNotDestroyed() {
    if (this.destroyed) {
      throw new Error('Plugin has been destroyed already');
    }
  }

  private assertConnected() {
    this.assertNotDestroyed();
    if (!this.connected) {
      throw new Error('Plugin is not connected');
    }
  }
}

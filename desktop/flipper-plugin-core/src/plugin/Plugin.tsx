/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {SandyPluginDefinition} from './SandyPluginDefinition';
import {BasePluginInstance, BasePluginClient} from './PluginBase';
import {FlipperLib} from './FlipperLib';
import {Device} from './DevicePlugin';
import {batched} from '../state/batch';
import {Atom, createState, ReadOnlyAtom} from '../state/atom';
import {
  ServerAddOnControls,
  EventsContract,
  MethodsContract,
} from 'flipper-common';
import type {FC} from 'react';

type PreventIntersectionWith<Contract extends Record<string, any>> = {
  [Key in keyof Contract]?: never;
};

type Message = {
  method: string;
  params?: any;
};

/**
 * API available to a plugin factory
 */
export interface PluginClient<
  Events extends EventsContract = {},
  Methods extends MethodsContract = {},
  ServerAddOnEvents extends EventsContract &
    PreventIntersectionWith<Events> = {},
  ServerAddOnMethods extends MethodsContract &
    PreventIntersectionWith<Methods> = {},
> extends BasePluginClient<ServerAddOnEvents, ServerAddOnMethods> {
  /**
   * Identifier that uniquely identifies the connected application
   */
  readonly appId: string;

  /**
   * Registered name for the connected application
   */
  readonly appName: string;

  readonly isConnected: boolean;
  readonly connected: ReadOnlyAtom<boolean>;

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
   * Subscribe to a specific event arriving from the device.
   *
   * Messages can only arrive if the plugin is enabled and connected.
   * For background plugins messages will be batched and arrive the next time the plugin is connected.
   */
  onMessage<Event extends keyof Events>(
    event: Event,
    callback: (params: Events[Event]) => void,
  ): void;

  /**
   * Subscribe to all messages arriving from the devices not handled by another listener.
   *
   * This handler is untyped, and onMessage should be favored over using onUnhandledMessage if the event name is known upfront.
   */
  onUnhandledMessage(callback: (event: string, params: any) => void): void;

  /**
   * Send a message to the connected client
   */
  send<Method extends keyof Methods>(
    method: Method,
    params: Parameters<Methods[Method]>[0],
  ): ReturnType<Methods[Method]>;

  /**
   * Checks if a method is available on the client implementation
   */
  supportsMethod(method: keyof Methods): Promise<boolean>;

  /**
   * opens a different plugin by id, optionally providing a deeplink to bring the plugin to a certain state
   */
  selectPlugin(pluginId: string, deeplinkPayload?: unknown): void;
}

/**
 * Internal API exposed by Flipper, and wrapped by FlipperPluginInstance to be passed to the
 * Plugin Factory. For internal purposes only
 */
export interface RealFlipperClient {
  id: string;
  connected: Atom<boolean>;
  query: {
    app: string;
    os: string;
    device: string;
    device_id: string;
  };
  device: Device;
  plugins: Set<string>;
  isBackgroundPlugin(pluginId: string): boolean;
  initPlugin(pluginId: string): void;
  deinitPlugin(pluginId: string): void;
  call(
    api: string,
    method: string,
    fromPlugin: boolean,
    params?: Object,
  ): Promise<Object>;
  supportsMethod(api: string, method: string): Promise<boolean>;
}

export type PluginFactory<
  Events extends EventsContract,
  Methods extends MethodsContract,
  ServerAddOnEvents extends EventsContract & PreventIntersectionWith<Events>,
  ServerAddOnMethods extends MethodsContract & PreventIntersectionWith<Methods>,
> = (
  client: PluginClient<Events, Methods, ServerAddOnEvents, ServerAddOnMethods>,
) => object;

export type FlipperPluginComponent = FC<{}>;

export class SandyPluginInstance extends BasePluginInstance {
  static is(thing: any): thing is SandyPluginInstance {
    return thing instanceof SandyPluginInstance;
  }

  /** base client provided by Flipper */
  readonly realClient: RealFlipperClient;
  /** client that is bound to this instance */
  readonly client: PluginClient<any, any, any, any>;
  /** connection alive? */
  readonly connected = createState(false);

  constructor(
    serverAddOnControls: ServerAddOnControls,
    flipperLib: FlipperLib,
    definition: SandyPluginDefinition,
    realClient: RealFlipperClient,
    pluginKey: string,
    initialStates?: Record<string, any>,
  ) {
    super(
      serverAddOnControls,
      flipperLib,
      definition,
      realClient.device,
      pluginKey,
      initialStates,
    );
    this.realClient = realClient;
    this.definition = definition;
    const self = this;
    this.client = {
      ...this.createBasePluginClient(),
      get appId() {
        return realClient.id;
      },
      get appName() {
        return realClient.query.app;
      },
      connected: self.connected,
      get isConnected() {
        return self.connected.get();
      },
      onConnect: (cb) => {
        this.events.on('connect', batched(cb));
      },
      onDisconnect: (cb) => {
        this.events.on('disconnect', batched(cb));
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
      onMessage: (event, cb) => {
        this.events.on(`event-${event.toString()}`, batched(cb));
      },
      onUnhandledMessage: (cb) => {
        this.events.on('unhandled-event', batched(cb));
      },
      supportsMethod: async (method) => {
        return await realClient.supportsMethod(
          this.definition.id,
          method as any,
        );
      },
      selectPlugin(pluginId: string, deeplink?: unknown) {
        flipperLib.selectPlugin(
          realClient.device,
          realClient,
          pluginId,
          deeplink,
        );
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
    if (
      !this.connected.get() &&
      !this.realClient.isBackgroundPlugin(pluginId)
    ) {
      this.realClient.initPlugin(pluginId); // will call connect() if needed
    }
  }

  // the plugin is deselected in the UI
  deactivate() {
    super.deactivate();
    const pluginId = this.definition.id;
    if (this.connected.get() && !this.realClient.isBackgroundPlugin(pluginId)) {
      this.realClient.deinitPlugin(pluginId);
    }
  }

  connect() {
    this.assertNotDestroyed();
    if (!this.connected.get()) {
      this.startServerAddOn();
      this.connected.set(true);
      this.events.emit('connect');
    }
  }

  disconnect() {
    this.assertNotDestroyed();
    if (this.connected.get()) {
      this.stopServerAddOn();
      this.connected.set(false);
      this.events.emit('disconnect');
    }
  }

  destroy() {
    if (this.connected.get()) {
      this.realClient.deinitPlugin(this.definition.id);
    }
    super.destroy();
  }

  receiveMessages(messages: Message[]) {
    messages.forEach((message) => {
      if (this.events.listenerCount('event-' + message.method) > 0) {
        this.events.emit('event-' + message.method, message.params);
      } else {
        this.events.emit('unhandled-event', message.method, message.params);
      }
    });
  }

  toJSON() {
    return '[SandyPluginInstance]';
  }

  protected get serverAddOnOwner() {
    return this.realClient.id;
  }

  private assertConnected() {
    this.assertNotDestroyed();
    // This is a better-safe-than-sorry; just the first condition should suffice
    if (!this.connected.get()) {
      throw new Error(
        'SandyPluginInstance.assertConnected -> plugin is not connected',
      );
    }
    if (!this.realClient.connected.get()) {
      throw new Error(
        'SandyPluginInstance.assertConnected -> realClient is not connected',
      );
    }
    if (!this.device.isConnected) {
      throw new Error(
        'SandyPluginInstance.assertConnected -> device is not connected',
      );
    }
    if (this.device.isArchived) {
      throw new Error(
        'SandyPluginInstance.assertConnected -> device is archived',
      );
    }
  }
}

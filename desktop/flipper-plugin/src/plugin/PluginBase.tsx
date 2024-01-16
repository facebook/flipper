/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import EventEmitter from 'eventemitter3';
import {SandyPluginDefinition} from './SandyPluginDefinition';
import {MenuEntry, NormalizedMenuEntry, normalizeMenuEntry} from './MenuEntry';
import {FlipperLib} from './FlipperLib';
import {CrashLogListener, Device, DeviceLogListener} from './DevicePlugin';
import {batched} from '../state/batch';
import {Idler} from '../utils/Idler';
import {Notification} from './Notification';
import {Logger} from '../utils/Logger';
import {CreatePasteArgs, CreatePasteResult} from './Paste';
import {
  EventsContract,
  MethodsContract,
  ServerAddOnControls,
} from 'flipper-common';

type StateExportHandler<T = any> = (
  idler: Idler,
  onStatusMessage: (msg: string) => void,
) => Promise<T | undefined | void>;
type StateImportHandler<T = any> = (data: T) => void;

export interface BasePluginClient<
  ServerAddOnEvents extends EventsContract = {},
  ServerAddOnMethods extends MethodsContract = {},
> {
  /**
   * A key that uniquely identifies this plugin instance, captures the current device/client/plugin combination.
   */
  readonly pluginKey: string;
  readonly device: Device;

  /**
   * the onDestroy event is fired whenever a device is unloaded from Flipper, or a plugin is disabled.
   */
  onDestroy(cb: () => void): void;

  /**
   * the onActivate event is fired whenever the plugin is actived in the UI
   *
   * @returns an unsubscribe callback
   */
  onActivate(cb: () => void): () => void;

  /**
   * The counterpart of the `onActivate` handler.
   *
   * @returns an unsubscribe callback
   */
  onDeactivate(cb: () => void): () => void;

  /**
   * Triggered when this plugin is opened through a deeplink
   *
   * @returns an unsubscribe callback
   */
  onDeepLink(cb: (deepLink: unknown) => void): () => void;

  /**
   * Triggered when the current plugin is being exported and should create a snapshot of the state exported.
   * Overrides the default export behavior and ignores any 'persist' flags of state.
   *
   * If an object is returned from the handler, that will be taken as export.
   * Otherwise, if nothing is returned, the handler will be run, and after the handler has finished the `persist` keys of the different states will be used as export basis.
   */
  onExport<T extends object>(exporter: StateExportHandler<T>): void;

  /**
   * Triggered directly after the plugin instance was created, if the plugin is being restored from a snapshot.
   * Should be the inverse of the onExport handler
   */
  onImport<T = any>(handler: StateImportHandler<T>): void;

  /**
   * The `onReady` event is triggered immediately after a plugin has been initialized and any pending state was restored.
   * This event fires after `onImport` / the interpretation of any `persist` flags and indicates that the initialization process has finished.
   * This event does not signal that the plugin is loaded in the UI yet (see `onActivated`) and does fire before deeplinks (see `onDeepLink`) are handled.
   *
   * @returns an unsubscribe callback
   */
  onReady(handler: () => void): () => void;

  /**
   * Register menu entries in the Flipper toolbar
   */
  addMenuEntry(...entry: MenuEntry[]): void;

  /**
   * Listener that is triggered if the underlying device emits a log message.
   * Listeners established with this mechanism will automatically be cleaned up during destroy
   */
  onDeviceLogEntry(cb: DeviceLogListener): () => void;

  /**
   * Listener that is triggered if the underlying device crashes.
   * Listeners established with this mechanism will automatically be cleaned up during destroy
   */
  onDeviceCrash(cb: CrashLogListener): () => void;

  /**
   * Creates a Paste (similar to a Github Gist).
   * Facebook only function. Resolves to undefined if creating a paste failed.
   */
  createPaste(
    args: string | CreatePasteArgs,
  ): Promise<CreatePasteResult | undefined>;

  /**
   * Returns true if this is an internal Facebook build.
   * Always returns `false` in open source
   */
  readonly isFB: boolean;

  /**
   * Returns true if the user is taking part in the given gatekeeper.
   * Always returns `false` in open source.
   */
  GK(gkName: string): boolean;

  /**
   * Shows an urgent, system wide notification, that will also be registered in Flipper's notification pane.
   * For on-screen notifications, we recommend to use either the `message` or `notification` API from `antd` directly.
   *
   * Clicking the notification will open this plugin. If the `action` id is set, it will be used as deeplink.
   */
  showNotification(notification: Notification): void;

  /**
   * Writes text to the clipboard of the Operating System
   */
  writeTextToClipboard(text: string): void;

  /**
   * Logger instance that logs information to the console, but also to the internal logging (in FB only builds) and which can be used to track performance.
   */
  logger: Logger;

  /**
   * Triggered when a server add-on starts.
   * You should send messages to the server add-on only after it connects.
   * Do not forget to stop all communication when the add-on stops.
   * See `onServerAddStop`.
   *
   * @returns an unsubscribe callback
   */
  onServerAddOnStart(callback: () => void): () => void;

  /**
   * Triggered when a server add-on stops.
   * You should stop all communication with the server add-on when the add-on stops.
   *
   * @returns an unsubscribe callback
   */
  onServerAddOnStop(callback: () => void): () => void;

  /**
   * Subscribe to a specific event arriving from the server add-on.
   * Messages can only arrive if the plugin is enabled and connected.
   */
  onServerAddOnMessage<Event extends keyof ServerAddOnEvents & string>(
    event: Event,
    callback: (params: ServerAddOnEvents[Event]) => void,
  ): void;

  /**
   * Subscribe to all messages arriving from the server add-ons not handled by another listener.
   *
   * This handler is untyped, and onMessage should be favored over using onUnhandledMessage if the event name is known upfront.
   */
  onServerAddOnUnhandledMessage(
    callback: (event: string, params: any) => void,
  ): void;

  /**
   * Send a message to the server add-on
   */
  sendToServerAddOn<Method extends keyof ServerAddOnMethods & string>(
    method: Method,
    ...params: Parameters<ServerAddOnMethods[Method]> extends []
      ? []
      : [Parameters<ServerAddOnMethods[Method]>[0]]
  ): ReturnType<ServerAddOnMethods[Method]>;
}

let currentPluginInstance: BasePluginInstance | undefined = undefined;

export function setCurrentPluginInstance(
  instance: typeof currentPluginInstance,
) {
  currentPluginInstance = instance;
}

export function getCurrentPluginInstance(): typeof currentPluginInstance {
  return currentPluginInstance;
}

export interface Persistable {
  serialize(): any;
  deserialize(value: any): void;
}

export function registerStorageAtom(
  key: string | undefined,
  persistable: Persistable,
) {
  const pluginInstance = getCurrentPluginInstance();
  if (key && pluginInstance) {
    const {rootStates} = pluginInstance;
    if (rootStates[key]) {
      throw new Error(
        `Some other state is already persisting with key "${key}"`,
      );
    }
    rootStates[key] = persistable;
  }
}

let staticInstanceId = 1;

export abstract class BasePluginInstance {
  /** generally available Flipper APIs */
  readonly flipperLib: FlipperLib;
  /** the original plugin definition */
  definition: SandyPluginDefinition;
  /** the plugin instance api as used inside components and such  */
  instanceApi: any;
  /** the device owning this plugin */
  readonly device: Device;

  /** the unique plugin key for this plugin instance, which is unique for this device/app?/pluginId combo */
  readonly pluginKey: string;

  activated = false;
  destroyed = false;
  private serverAddOnStarted = false;
  private serverAddOnStopped = false;
  readonly events = new EventEmitter();

  // temporarily field that is used during deserialization
  initialStates?: Record<string, any>;

  // all the atoms that should be serialized when making an export / import
  readonly rootStates: Record<string, Persistable> = {};
  // last seen deeplink
  lastDeeplink?: any;
  // export handler
  exportHandler?: StateExportHandler;
  // import handler
  importHandler?: StateImportHandler;

  menuEntries: NormalizedMenuEntry[] = [];
  logListeners: Symbol[] = [];
  crashListeners: Symbol[] = [];

  readonly instanceId = ++staticInstanceId;

  constructor(
    private readonly serverAddOnControls: ServerAddOnControls,
    flipperLib: FlipperLib,
    definition: SandyPluginDefinition,
    device: Device,
    pluginKey: string,
    initialStates?: Record<string, any>,
  ) {
    this.flipperLib = flipperLib;
    this.definition = definition;
    this.initialStates = initialStates;
    this.pluginKey = pluginKey;
    if (!device) {
      throw new Error('Illegal State: Device has not yet been loaded');
    }
    this.device = device;
  }

  protected initializePlugin(factory: () => any) {
    // To be called from constructory
    setCurrentPluginInstance(this);
    try {
      this.instanceApi = batched(factory)();
    } finally {
      // check if we have both an import handler and rootStates; probably dev error
      if (this.importHandler && Object.keys(this.rootStates).length > 0) {
        throw new Error(
          `A custom onImport handler was defined for plugin '${
            this.definition.id
          }', the 'persist' option of states ${Object.keys(
            this.rootStates,
          ).join(', ')} should not be set.`,
        );
      }
      if (this.initialStates) {
        try {
          if (this.importHandler) {
            batched(this.importHandler)(this.initialStates);
          } else {
            for (const key in this.rootStates) {
              if (key in this.initialStates) {
                this.rootStates[key].deserialize(this.initialStates[key]);
              } else {
                console.warn(
                  `Tried to initialize plugin with existing data, however data for "${key}" is missing. Was the export created with a different Flipper version?`,
                );
              }
            }
          }
        } catch (e) {
          const msg = `An error occurred when importing data for plugin '${this.definition.id}': '${e}`;
          // msg is already specific
          // eslint-disable-next-line
          console.error(msg, e);
          this.events.emit('error', msg);
        }
      }
      this.initialStates = undefined;
      setCurrentPluginInstance(undefined);
    }
    try {
      this.events.emit('ready');
    } catch (e) {
      const msg = `An error occurred when initializing plugin '${this.definition.id}': '${e}`;
      // msg is already specific
      // eslint-disable-next-line
      console.error(msg, e);
      this.events.emit('error', msg);
    }
  }

  protected createBasePluginClient(): BasePluginClient<any, any> {
    return {
      pluginKey: this.pluginKey,
      device: this.device,
      onActivate: (cb) => {
        const cbWrapped = batched(cb);
        this.events.on('activate', cbWrapped);
        return () => {
          this.events.off('activate', cbWrapped);
        };
      },
      onDeactivate: (cb) => {
        const cbWrapped = batched(cb);
        this.events.on('deactivate', batched(cb));
        return () => {
          this.events.off('deactivate', cbWrapped);
        };
      },
      onDeepLink: (cb) => {
        const cbWrapped = batched(cb);
        this.events.on('deeplink', cbWrapped);
        return () => {
          this.events.off('deeplink', cbWrapped);
        };
      },
      onDestroy: (cb) => {
        this.events.on('destroy', batched(cb));
      },
      onExport: (cb) => {
        if (this.exportHandler) {
          throw new Error('onExport handler already set');
        }
        this.exportHandler = cb;
      },
      onImport: (cb) => {
        if (this.importHandler) {
          throw new Error('onImport handler already set');
        }
        this.importHandler = cb;
      },
      onReady: (cb) => {
        const cbWrapped = batched(cb);
        this.events.on('ready', cbWrapped);
        return () => {
          this.events.off('ready', cbWrapped);
        };
      },
      addMenuEntry: (...entries) => {
        for (const entry of entries) {
          const normalized = normalizeMenuEntry(entry);
          const idx = this.menuEntries.findIndex(
            (existing) =>
              existing.label === normalized.label ||
              existing.action === normalized.action,
          );
          if (idx !== -1) {
            this.menuEntries[idx] = normalizeMenuEntry(entry);
          } else {
            this.menuEntries.push(normalizeMenuEntry(entry));
          }
          if (this.activated) {
            // entries added after initial registration
            this.flipperLib.enableMenuEntries(this.menuEntries);
          }
        }
      },
      onDeviceLogEntry: (cb: DeviceLogListener): (() => void) => {
        const handle = this.device.addLogListener(cb);
        this.logListeners.push(handle);
        return () => {
          this.device.removeLogListener(handle);
        };
      },
      onDeviceCrash: (cb: CrashLogListener): (() => void) => {
        const handle = this.device.addCrashListener(cb);
        this.crashListeners.push(handle);
        return () => {
          this.device.removeCrashListener(handle);
        };
      },
      writeTextToClipboard: this.flipperLib.writeTextToClipboard,
      createPaste: this.flipperLib.createPaste,
      isFB: this.flipperLib.isFB,
      GK: this.flipperLib.GK,
      showNotification: (notification: Notification) => {
        this.flipperLib.showNotification(this.pluginKey, notification);
      },
      logger: this.flipperLib.logger,
      onServerAddOnStart: (cb) => {
        const cbWrapped = batched(cb);
        this.events.on('serverAddOnStart', cbWrapped);
        if (this.serverAddOnStarted) {
          cbWrapped();
        }
        return () => {
          this.events.off('serverAddOnStart', cbWrapped);
        };
      },
      onServerAddOnStop: (cb) => {
        const cbWrapped = batched(cb);
        this.events.on('serverAddOnStop', cbWrapped);
        if (this.serverAddOnStopped) {
          cbWrapped();
        }
        return () => {
          this.events.off('serverAddOnStop', cbWrapped);
        };
      },
      sendToServerAddOn: (method, params) =>
        this.serverAddOnControls.sendMessage(
          this.definition.packageName,
          method,
          params,
        ),
      onServerAddOnMessage: (event, cb) => {
        this.serverAddOnControls.receiveMessage(
          this.definition.packageName,
          event,
          batched(cb),
        );
      },
      onServerAddOnUnhandledMessage: (cb) => {
        this.serverAddOnControls.receiveAnyMessage(
          this.definition.packageName,
          batched(cb),
        );
      },
    };
  }

  // the plugin is selected in the UI
  activate() {
    this.assertNotDestroyed();
    if (!this.activated) {
      this.flipperLib.enableMenuEntries(this.menuEntries);
      this.activated = true;
      try {
        this.events.emit('activate');
      } catch (e) {
        console.error(`Failed to activate plugin: ${this.definition.id}`, e);
      }
      this.flipperLib.logger.trackTimeSince(
        `activePlugin-${this.definition.id}`,
      );
    }
  }

  deactivate() {
    if (this.destroyed) {
      return;
    }
    if (this.activated) {
      this.activated = false;
      this.lastDeeplink = undefined;
      try {
        this.events.emit('deactivate');
      } catch (e) {
        console.error(`Failed to deactivate plugin: ${this.definition.id}`, e);
      }
    }
  }

  destroy() {
    this.assertNotDestroyed();
    this.deactivate();
    this.logListeners.splice(0).forEach((handle) => {
      this.device.removeLogListener(handle);
    });
    this.crashListeners.splice(0).forEach((handle) => {
      this.device.removeCrashListener(handle);
    });
    this.serverAddOnControls.unsubscribePlugin(this.definition.packageName);
    this.events.emit('destroy');
    this.destroyed = true;
  }

  triggerDeepLink(deepLink: unknown) {
    this.assertNotDestroyed();
    if (deepLink !== this.lastDeeplink) {
      this.lastDeeplink = deepLink;
      // we only want to trigger deeplinks after the plugin had a chance to render
      setTimeout(() => {
        this.events.emit('deeplink', deepLink);
      }, 0);
    }
  }

  exportStateSync() {
    // This method is mainly intended for unit testing
    if (this.exportHandler) {
      throw new Error(
        'Cannot export sync a plugin that does have an export handler',
      );
    }
    return this.serializeRootStates();
  }

  private serializeRootStates() {
    return Object.fromEntries(
      Object.entries(this.rootStates).map(([key, atom]) => {
        try {
          return [key, atom.serialize()];
        } catch (e) {
          throw new Error(`Failed to serialize state '${key}': ${e}`);
        }
      }),
    );
  }

  async exportState(
    idler: Idler,
    onStatusMessage: (msg: string) => void,
  ): Promise<Record<string, any>> {
    if (this.exportHandler) {
      const result = await this.exportHandler(idler, onStatusMessage);
      if (result !== undefined) {
        return result;
      }
      // intentional fall-through, the export handler merely updated the state, but prefers the default export format
    }
    return this.serializeRootStates();
  }

  isPersistable(): boolean {
    return !!this.exportHandler || Object.keys(this.rootStates).length > 0;
  }

  protected assertNotDestroyed() {
    if (this.destroyed) {
      throw new Error('Plugin has been destroyed already');
    }
  }

  abstract toJSON(): string;

  protected abstract serverAddOnOwner: string;

  protected startServerAddOn() {
    const pluginDetails = this.definition.details;
    if (pluginDetails.serverAddOn && pluginDetails.serverAddOnEntry) {
      this.serverAddOnControls
        .start(
          pluginDetails.name,
          {path: pluginDetails.serverAddOnEntry},
          this.serverAddOnOwner,
        )
        .then(() => {
          this.events.emit('serverAddOnStart');
          this.serverAddOnStarted = true;
        })
        .catch((e) => {
          console.warn(
            'Failed to start a server add on',
            pluginDetails.name,
            this.serverAddOnOwner,
            e,
          );
        });
    }
  }

  protected stopServerAddOn() {
    const {serverAddOn, name} = this.definition.details;
    if (serverAddOn) {
      this.serverAddOnControls
        .stop(name, this.serverAddOnOwner)
        .finally(() => {
          this.events.emit('serverAddOnStop');
          this.serverAddOnStopped = true;
        })
        .catch((e) => {
          console.warn(
            'Failed to stop a server add on',
            name,
            this.serverAddOnOwner,
            e,
          );
        });
    }
  }
}

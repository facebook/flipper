/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {message} from 'antd';
import {EventEmitter} from 'events';
import {SandyPluginDefinition} from './SandyPluginDefinition';
import {MenuEntry, NormalizedMenuEntry, normalizeMenuEntry} from './MenuEntry';
import {FlipperLib} from './FlipperLib';
import {Device, RealFlipperDevice} from './DevicePlugin';
import {batched} from '../state/batch';
import {Idler} from '../utils/Idler';
import {Notification} from './Notification';
import {Logger} from '../utils/Logger';

type StateExportHandler<T = any> = (
  idler: Idler,
  onStatusMessage: (msg: string) => void,
) => Promise<T | undefined | void>;
type StateImportHandler<T = any> = (data: T) => void;

export interface BasePluginClient {
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
   */
  onActivate(cb: () => void): void;

  /**
   * The counterpart of the `onActivate` handler.
   */
  onDeactivate(cb: () => void): void;

  /**
   * Triggered when this plugin is opened through a deeplink
   */
  onDeepLink(cb: (deepLink: unknown) => void): void;

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
   * This event does not signal that the plugin is loaded in the UI yet (see `onActivated`) and does fire before deeplinks (see `onDeeplink`) are handled.
   */
  onReady(handler: () => void): void;

  /**
   * Register menu entries in the Flipper toolbar
   */
  addMenuEntry(...entry: MenuEntry[]): void;

  /**
   * Creates a Paste (similar to a Github Gist).
   * Facebook only function. Resolves to undefined if creating a paste failed.
   */
  createPaste(input: string): Promise<string | undefined>;

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
  if (key && getCurrentPluginInstance()) {
    const {rootStates} = getCurrentPluginInstance()!;
    if (rootStates[key]) {
      throw new Error(
        `Some other state is already persisting with key "${key}"`,
      );
    }
    rootStates[key] = persistable;
  }
}

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

  constructor(
    flipperLib: FlipperLib,
    definition: SandyPluginDefinition,
    realDevice: RealFlipperDevice,
    pluginKey: string,
    initialStates?: Record<string, any>,
  ) {
    this.flipperLib = flipperLib;
    this.definition = definition;
    this.initialStates = initialStates;
    this.pluginKey = pluginKey;
    if (!realDevice) {
      throw new Error('Illegal State: Device has not yet been loaded');
    }
    this.device = {
      realDevice, // TODO: temporarily, clean up T70688226
      // N.B. we model OS as string, not as enum, to make custom device types possible in the future
      os: realDevice.os,
      serial: realDevice.serial,
      get isArchived() {
        return realDevice.isArchived;
      },
      get isConnected() {
        return realDevice.connected.get();
      },
      deviceType: realDevice.deviceType,
      onLogEntry: (cb) => {
        const handle = realDevice.addLogListener(cb);
        this.logListeners.push(handle);
        return () => {
          realDevice.removeLogListener(handle);
        };
      },
    };
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
          message.error(msg);
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
      message.error(msg);
    }
  }

  protected createBasePluginClient(): BasePluginClient {
    return {
      pluginKey: this.pluginKey,
      device: this.device,
      onActivate: (cb) => {
        this.events.on('activate', batched(cb));
      },
      onDeactivate: (cb) => {
        this.events.on('deactivate', batched(cb));
      },
      onDeepLink: (cb) => {
        this.events.on('deeplink', batched(cb));
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
        this.events.on('ready', batched(cb));
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
      writeTextToClipboard: this.flipperLib.writeTextToClipboard,
      createPaste: this.flipperLib.createPaste,
      isFB: this.flipperLib.isFB,
      GK: this.flipperLib.GK,
      showNotification: (notification: Notification) => {
        this.flipperLib.showNotification(this.pluginKey, notification);
      },
      logger: this.flipperLib.logger,
    };
  }

  // the plugin is selected in the UI
  activate() {
    this.assertNotDestroyed();
    if (!this.activated) {
      this.flipperLib.enableMenuEntries(this.menuEntries);
      this.activated = true;
      this.events.emit('activate');
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
      this.events.emit('deactivate');
    }
  }

  destroy() {
    this.assertNotDestroyed();
    this.deactivate();
    this.logListeners.splice(0).forEach((handle) => {
      this.device.realDevice.removeLogListener(handle);
    });
    this.events.emit('destroy');
    this.destroyed = true;
  }

  triggerDeepLink(deepLink: unknown) {
    this.assertNotDestroyed();
    if (deepLink !== this.lastDeeplink) {
      this.lastDeeplink = deepLink;
      if (typeof setImmediate !== 'undefined') {
        // we only want to trigger deeplinks after the plugin had a chance to render
        setImmediate(() => {
          this.events.emit('deeplink', deepLink);
        });
      } else {
        this.events.emit('deeplink', deepLink);
      }
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
      Object.entries(this.rootStates).map(([key, atom]) => [
        key,
        atom.serialize(),
      ]),
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
}

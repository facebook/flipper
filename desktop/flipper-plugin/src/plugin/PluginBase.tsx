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
import {MenuEntry, NormalizedMenuEntry, normalizeMenuEntry} from './MenuEntry';
import {FlipperLib} from './FlipperLib';
import {Device, RealFlipperDevice} from './DevicePlugin';
import {batched} from '../state/batch';

export interface BasePluginClient {
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
   * Register menu entries in the Flipper toolbar
   */
  addMenuEntry(...entry: MenuEntry[]): void;

  /**
   * Creates a Paste (similar to a Github Gist).
   * Facebook only function. Resolves to undefined if creating a paste failed.
   */
  createPaste(input: string): Promise<string | undefined>;

  /**
   * Returns true if the user is taking part in the given gatekeeper.
   * Always returns `false` in open source.
   */
  GK(gkName: string): boolean;
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

export abstract class BasePluginInstance {
  /** generally available Flipper APIs */
  flipperLib: FlipperLib;
  /** the original plugin definition */
  definition: SandyPluginDefinition;
  /** the plugin instance api as used inside components and such  */
  instanceApi: any;
  /** the device owning this plugin */
  device: Device;

  activated = false;
  destroyed = false;
  events = new EventEmitter();

  // temporarily field that is used during deserialization
  initialStates?: Record<string, any>;
  // all the atoms that should be serialized when making an export / import
  rootStates: Record<string, Atom<any>> = {};
  // last seen deeplink
  lastDeeplink?: any;

  menuEntries: NormalizedMenuEntry[] = [];

  constructor(
    flipperLib: FlipperLib,
    definition: SandyPluginDefinition,
    realDevice: RealFlipperDevice,
    initialStates?: Record<string, any>,
  ) {
    this.flipperLib = flipperLib;
    this.definition = definition;
    this.initialStates = initialStates;
    if (!realDevice) {
      throw new Error('Illegal State: Device has not yet been loaded');
    }
    this.device = {
      realDevice, // TODO: temporarily, clean up T70688226
      // N.B. we model OS as string, not as enum, to make custom device types possible in the future
      os: realDevice.os,
      isArchived: realDevice.isArchived,
      deviceType: realDevice.deviceType,

      onLogEntry(cb) {
        const handle = realDevice.addLogListener(cb);
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
      this.initialStates = undefined;
      setCurrentPluginInstance(undefined);
    }
  }

  protected createBasePluginClient(): BasePluginClient {
    return {
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
      addMenuEntry: (...entries) => {
        for (const entry of entries) {
          const normalized = normalizeMenuEntry(entry);
          if (
            this.menuEntries.find(
              (existing) =>
                existing.label === normalized.label ||
                existing.action === normalized.action,
            )
          ) {
            throw new Error(`Duplicate menu entry: '${normalized.label}'`);
          }
          this.menuEntries.push(normalizeMenuEntry(entry));
        }
      },
      createPaste: this.flipperLib.createPaste,
      GK: this.flipperLib.GK,
    };
  }

  // the plugin is selected in the UI
  activate() {
    this.assertNotDestroyed();
    if (!this.activated) {
      this.activated = true;
      this.flipperLib.enableMenuEntries(this.menuEntries);
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
    this.events.emit('destroy');
    this.destroyed = true;
  }

  triggerDeepLink(deepLink: unknown) {
    this.assertNotDestroyed();
    if (deepLink !== this.lastDeeplink) {
      this.lastDeeplink = deepLink;
      this.events.emit('deeplink', deepLink);
    }
  }

  exportState() {
    return Object.fromEntries(
      Object.entries(this.rootStates).map(([key, atom]) => [key, atom.get()]),
    );
  }

  isPersistable(): boolean {
    return Object.keys(this.rootStates).length > 0;
  }

  protected assertNotDestroyed() {
    if (this.destroyed) {
      throw new Error('Plugin has been destroyed already');
    }
  }

  abstract toJSON(): string;
}

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

export interface BasePluginClient {
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
    initialStates?: Record<string, any>,
  ) {
    this.flipperLib = flipperLib;
    this.definition = definition;
    this.initialStates = initialStates;
  }

  protected initializePlugin(factory: () => any) {
    // To be called from constructory
    setCurrentPluginInstance(this);
    try {
      this.instanceApi = factory();
    } finally {
      this.initialStates = undefined;
      setCurrentPluginInstance(undefined);
    }
  }

  protected createBasePluginClient(): BasePluginClient {
    return {
      onActivate: (cb) => {
        this.events.on('activate', cb);
      },
      onDeactivate: (cb) => {
        this.events.on('deactivate', cb);
      },
      onDeepLink: (callback) => {
        this.events.on('deeplink', callback);
      },
      onDestroy: (cb) => {
        this.events.on('destroy', cb);
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
    };
  }

  // the plugin is selected in the UI
  activate() {
    this.assertNotDestroyed();
    if (!this.activated) {
      this.activated = true;
      this.flipperLib.enableMenuEntries(this.menuEntries);
      this.events.emit('activate');
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

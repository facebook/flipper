/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ActivatablePluginDetails} from 'flipper-plugin-lib';
import {PluginFactory, FlipperPluginComponent} from './Plugin';
import {DevicePluginPredicate, DevicePluginFactory} from './DevicePlugin';

/**
 * FlipperPluginModule describe the exports that are provided by a typical Flipper Desktop plugin
 */
export type FlipperDevicePluginModule = {
  /** predicate that determines if this plugin applies to the currently selcted device */
  supportsDevice?: DevicePluginPredicate; // TODO T84453692: remove this function after some transition period in favor of BaseDevice.supportsPlugin.
  /** the factory function that initializes a plugin instance */
  devicePlugin: DevicePluginFactory;
  /** the component type that can render this plugin */
  Component: FlipperPluginComponent;
};

/**
 * FlipperPluginModule describe the exports that are provided by a typical Flipper Desktop plugin
 */
export type FlipperPluginModule<Factory extends PluginFactory<any, any>> = {
  /** the factory function that initializes a plugin instance */
  plugin: Factory;
  /** the component type that can render this plugin */
  Component: FlipperPluginComponent;
};

/**
 * A sandy plugin definition represents a loaded plugin definition, storing two things:
 * the loaded JS module, and the meta data (typically coming from package.json).
 *
 * Also delegates some of the standard plugin functionality to have a similar public static api as FlipperPlugin
 */
export class SandyPluginDefinition {
  id: string;
  module: FlipperPluginModule<any> | FlipperDevicePluginModule;
  details: ActivatablePluginDetails;
  isDevicePlugin: boolean;

  constructor(
    details: ActivatablePluginDetails,
    module: FlipperPluginModule<any> | FlipperDevicePluginModule,
  );
  constructor(details: ActivatablePluginDetails, module: any) {
    this.id = details.id;
    this.details = details;
    if (details.pluginType === 'device' || module.supportsDevice) {
      // device plugin
      this.isDevicePlugin = true;
      if (!module.devicePlugin || typeof module.devicePlugin !== 'function') {
        throw new Error(
          `Flipper device plugin '${this.id}' should export named function called 'devicePlugin'`,
        );
      }
    } else {
      this.isDevicePlugin = false;
      if (!module.plugin || typeof module.plugin !== 'function') {
        throw new Error(
          `Flipper plugin '${this.id}' should export named function called 'plugin'`,
        );
      }
    }
    if (!module.Component || typeof module.Component !== 'function') {
      throw new Error(
        `Flipper plugin '${this.id}' should export named function called 'Component'`,
      );
    }
    this.module = module;
    this.module.Component.displayName = `FlipperPlugin(${this.id})`;
  }

  asDevicePluginModule(): FlipperDevicePluginModule {
    if (!this.isDevicePlugin) throw new Error('Not a device plugin');
    return this.module as FlipperDevicePluginModule;
  }

  asPluginModule(): FlipperPluginModule<any> {
    if (this.isDevicePlugin) throw new Error('Not an application plugin');
    return this.module as FlipperPluginModule<any>;
  }

  get packageName() {
    return this.details.name;
  }

  get title() {
    return this.details.title;
  }

  get icon() {
    return this.details.icon;
  }

  get category() {
    return this.details.category;
  }

  get gatekeeper() {
    return this.details.gatekeeper;
  }

  get version() {
    return this.details.version;
  }

  get isBundled() {
    return this.details.isBundled;
  }

  get keyboardActions() {
    // TODO: T68882551 support keyboard actions
    return [];
  }
}

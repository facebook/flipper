/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PluginDetails} from 'flipper-plugin-lib';

type EventsContract = Record<string, any>;
type MethodsContract = Record<string, (params: any) => Promise<any>>;

/**
 * API available to a plugin factory
 */
export interface FlipperClient<
  Events extends EventsContract,
  Methods extends MethodsContract
> {}

/**
 * Internal API exposed by Flipper, and wrapped by FlipperPluginInstance to be passed to the
 * Plugin Factory
 */
interface RealFlipperClient {}

export type FlipperPluginFactory<
  Events extends EventsContract,
  Methods extends MethodsContract
> = (client: FlipperClient<Events, Methods>) => object;

export type FlipperPluginComponent = React.FC<{}>;

export type FlipperPluginModule = {
  /** the factory function that initializes a plugin instance */
  plugin: FlipperPluginFactory<any, any>;
  /** the component type that can render this plugin */
  Component: FlipperPluginComponent;
  // TODO: support device plugins T68738317
  // devicePlugin: FlipperPluginFactory
};

export class FlipperPluginInstance {
  /** base client provided by Flipper */
  realClient: RealFlipperClient;
  /** client that is bound to this instance */
  client: FlipperClient<any, any>;
  /** the original plugin definition */
  definition: FlipperPluginModule;
  /** the plugin instance api as used inside components and such  */
  instanceApi: object;

  constructor(realClient: RealFlipperClient, definition: FlipperPluginModule) {
    this.realClient = realClient;
    this.definition = definition;
    this.client = {};
    this.instanceApi = definition.plugin(this.client);
  }

  deactivate() {
    // TODO:
  }
}

/**
 * A sandy plugin definitions represents a loaded plugin definition, storing two things:
 * the loaded JS module, and the meta data (typically coming from package.json).
 *
 * Also delegates some of the standard plugin functionality to have a similar public static api as FlipperPlugin
 */
export class SandyPluginDefinition {
  id: string;
  module: FlipperPluginModule;
  details: PluginDetails;

  // TODO: Implement T68683449
  exportPersistedState:
    | ((
        callClient: (method: string, params?: any) => Promise<any>,
        persistedState: any, // TODO: type StaticPersistedState | undefined,
        store: any, // TODO: ReduxState | undefined,
        idler?: any, // TODO: Idler,
        statusUpdate?: (msg: string) => void,
        supportsMethod?: (method: string) => Promise<boolean>,
      ) => Promise<any /* TODO: StaticPersistedState | undefined */>)
    | undefined = undefined;

  constructor(details: PluginDetails, module: FlipperPluginModule) {
    this.id = details.id;
    this.details = details;
    if (!module.plugin || typeof module.plugin !== 'function') {
      throw new Error(
        `Flipper plugin '${this.id}' should export named function called 'plugin'`,
      );
    }
    if (!module.Component || typeof module.Component !== 'function') {
      throw new Error(
        `Flipper plugin '${this.id}' should export named function called 'Component'`,
      );
    }
    this.module = module;
    this.module.Component.displayName = `FlipperPlugin(${this.id})`;
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

  get isDefault() {
    return this.details.isDefault;
  }

  get keyboardActions() {
    // TODO: T68882551 support keyboard actions
    return [];
  }
}

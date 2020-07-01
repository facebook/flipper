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
}

/**
 * Internal API exposed by Flipper, and wrapped by FlipperPluginInstance to be passed to the
 * Plugin Factory. For internal purposes only
 */
interface RealFlipperClient {}

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
    };
    this.instanceApi = definition.module.plugin(this.client);
  }

  activate() {
    // TODO: T68683507
  }

  deactivate() {
    // TODO: T68683507
  }

  destroy() {
    this.events.emit('destroy');
  }

  toJSON() {
    // TODO: T68683449
  }
}

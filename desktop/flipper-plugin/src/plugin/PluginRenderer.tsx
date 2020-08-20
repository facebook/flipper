/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {memo, useEffect, createElement} from 'react';
import {SandyPluginContext} from './PluginContext';
import {SandyPluginInstance} from './Plugin';
import {SandyDevicePluginInstance} from './DevicePlugin';
import {BasePluginInstance} from './PluginBase';

type Props = {
  plugin: SandyPluginInstance | SandyDevicePluginInstance;
};

/**
 * Component to render a Sandy plugin container
 */
export const SandyPluginRenderer = memo(({plugin}: Props) => {
  if (!plugin || !(plugin instanceof BasePluginInstance)) {
    throw new Error('Expected plugin, got ' + plugin);
  }
  useEffect(() => {
    plugin.activate();
    return () => {
      plugin.deactivate();
    };
  }, [plugin]);

  return (
    <SandyPluginContext.Provider value={plugin}>
      {createElement(plugin.definition.module.Component)}
    </SandyPluginContext.Provider>
  );
});

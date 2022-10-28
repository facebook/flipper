/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {memo, useEffect, createElement} from 'react';
import {SandyPluginContext} from './PluginContext';
import {
  _SandyPluginInstance,
  _SandyDevicePluginInstance,
  _BasePluginInstance,
} from 'flipper-plugin-core';
import {TrackingScope} from '../ui/Tracked';

type Props = {
  plugin: _SandyPluginInstance | _SandyDevicePluginInstance;
};

/**
 * Component to render a Sandy plugin container
 */
export const SandyPluginRenderer = memo(({plugin}: Props) => {
  if (!plugin || !(plugin instanceof _BasePluginInstance)) {
    throw new Error('Expected plugin, got ' + plugin);
  }
  useEffect(() => {
    const style = document.createElement('style');
    if (plugin.definition.css) {
      style.innerText = plugin.definition.css;
      document.head.appendChild(style);
    }

    plugin.activate();
    return () => {
      plugin.deactivate();
      if (plugin.definition.css) {
        document.head.removeChild(style);
      }
    };
  }, [plugin]);

  return (
    <TrackingScope scope={'plugin:' + plugin.definition.id}>
      <SandyPluginContext.Provider value={plugin}>
        {createElement(plugin.definition.module.Component, {
          key: plugin.instanceId,
        })}
      </SandyPluginContext.Provider>
    </TrackingScope>
  );
});

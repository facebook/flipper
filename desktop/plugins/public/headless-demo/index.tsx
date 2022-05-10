/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';

import {createState, Layout, FlipperPluginInstance} from 'flipper-plugin';

export function API(
  pluginInstance: FlipperPluginInstance<typeof devicePlugin>,
) {
  return {
    increment: pluginInstance.increment,
  };
}

export function devicePlugin() {
  const data = createState(0);

  const increment = (step: number = 1) => {
    const newVal = data.get() + step;
    data.set(newVal);
    return newVal;
  };

  return {increment};
}

export function Component() {
  return (
    <Layout.ScrollContainer>
      I am a new shiny headless plugin
    </Layout.ScrollContainer>
  );
}

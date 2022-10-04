/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperServer, getLogger, wrapRequire} from 'flipper-common';
import {getRenderHostInstance, setGlobalObject} from 'flipper-frontend-core';
import * as FlipperPluginSDK from 'flipper-plugin-core';
import * as Immer from 'immer';
import {HeadlessPluginInitializer} from './HeadlessPluginInitializer';
import {initializeFlipperLibImplementation} from './initializeFlipperLibImplementation';
import {initializeRenderHost} from './initializeRenderHost';
import * as React from './globalsReplacements/fakeReact';
import * as ReactDOM from './globalsReplacements/fakeReactDOM';
import {styled} from './globalsReplacements/fakeEmotionStyled';
import * as emotionCss from './globalsReplacements/fakeEmotionCss';
import * as legacyExports from './globalsReplacements/fakeLegacyExports';
import Module from 'module';

export interface FlipperServerCompanionEnv {
  pluginInitializer: HeadlessPluginInitializer;
}

export const initCompanionEnv = async (
  flipperServer: FlipperServer,
): Promise<FlipperServerCompanionEnv> => {
  // Anything DOM-related (like React or ant) does not exist and should not be used in a headless context because there is no DOM to use
  setGlobalObject({
    React: React,
    ReactDOM: ReactDOM,
    ReactDOMClient: {},
    ReactIs: {},
    Flipper: legacyExports,
    FlipperPlugin: FlipperPluginSDK,
    Immer,
    antd: {},
    emotion_styled: {default: styled},
    emotion_css: emotionCss,
    antdesign_icons: {},
    ReactJsxRuntime: {},
  });
  Module.prototype.require = wrapRequire(Module.prototype.require);

  const flipperServerConfig = await flipperServer.exec('get-config');
  initializeRenderHost(flipperServer, flipperServerConfig);
  initializeFlipperLibImplementation(getRenderHostInstance(), getLogger());

  const pluginInitializer = new HeadlessPluginInitializer();
  await pluginInitializer.init();

  return {pluginInitializer};
};

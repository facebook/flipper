/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createContext} from 'react';

export type SandyPluginContext = {
  deactivate(): void;
};

// TODO: to be filled in later with testing and such
const stubPluginContext: SandyPluginContext = {
  deactivate() {},
};

export const SandyPluginContext = createContext<SandyPluginContext>(
  stubPluginContext,
);

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createContext} from 'react';
import {SandyPluginInstance} from './Plugin';

export const SandyPluginContext = createContext<
  SandyPluginInstance | undefined
>(undefined);

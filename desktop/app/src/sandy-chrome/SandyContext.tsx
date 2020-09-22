/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createContext, useContext} from 'react';

export const SandyContext = createContext(false);

export function useIsSandy(): boolean {
  return useContext(SandyContext);
}

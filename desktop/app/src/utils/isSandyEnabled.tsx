/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {store} from '../store';

export default function isSandyEnabled() {
  return !store.getState().settingsState.disableSandy;
}

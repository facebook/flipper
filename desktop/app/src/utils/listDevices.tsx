/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getActiveAndroidDevices} from '../dispatcher/androidDevice';
import {getActiveDevicesAndSimulators} from '../dispatcher/iOSDevice';
import BaseDevice from '../devices/BaseDevice';
import {Store} from '../reducers/index';

export async function listDevices(store: Store): Promise<Array<BaseDevice>> {
  const state = store.getState();
  const androidDevices = state.settingsState.enableAndroid
    ? await getActiveAndroidDevices(store)
    : [];
  const iOSDevices: BaseDevice[] = state.application
    .xcodeCommandLineToolsDetected
    ? await getActiveDevicesAndSimulators(store)
    : [];
  return [...androidDevices, ...iOSDevices];
}

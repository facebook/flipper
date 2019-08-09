/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import {getActiveAndroidDevices} from '../dispatcher/androidDevice.tsx';
import {getActiveDevicesAndSimulators} from '../dispatcher/iOSDevice';
import type BaseDevice from '../devices/BaseDevice.tsx';

export async function listDevices(): Promise<Array<BaseDevice>> {
  const androidDevices = await getActiveAndroidDevices();
  const iOSDevices = await getActiveDevicesAndSimulators();
  return iOSDevices.concat(androidDevices);
}

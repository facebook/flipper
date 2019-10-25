/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import {getActiveAndroidDevices} from '../dispatcher/androidDevice';
import {getActiveDevicesAndSimulators} from '../dispatcher/iOSDevice';
import BaseDevice from '../devices/BaseDevice';
import {Store} from '../reducers/index';

export async function listDevices(store: Store): Promise<Array<BaseDevice>> {
  const androidDevices = await getActiveAndroidDevices(store);
  const iOSDevices: BaseDevice[] = await getActiveDevicesAndSimulators();
  return iOSDevices.concat(androidDevices);
}

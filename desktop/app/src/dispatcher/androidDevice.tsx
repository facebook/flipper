/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import AndroidDevice from '../devices/AndroidDevice';
import KaiOSDevice from '../devices/KaiOSDevice';
import child_process from 'child_process';
import {Store} from '../reducers/index';
import BaseDevice from '../devices/BaseDevice';
import {Logger} from '../fb-interfaces/Logger';
import {registerDeviceCallbackOnPlugins} from '../utils/onRegisterDevice';
import {getAdbClient} from '../utils/adbClient';
import which from 'which';
import {promisify} from 'util';
import {ServerPorts} from '../reducers/application';
import {Client as ADBClient} from 'adbkit';
import {addErrorNotification} from '../reducers/notifications';

function createDevice(
  adbClient: ADBClient,
  device: any,
  store: Store,
  ports?: ServerPorts,
): Promise<AndroidDevice | undefined> {
  return new Promise((resolve, reject) => {
    const type =
      device.type !== 'device' || device.id.startsWith('emulator')
        ? 'emulator'
        : 'physical';

    adbClient
      .getProperties(device.id)
      .then(async (props) => {
        try {
          let name = props['ro.product.model'];
          const abiString = props['ro.product.cpu.abilist'] || '';
          const sdkVersion = props['ro.build.version.sdk'] || '';
          const abiList = abiString.length > 0 ? abiString.split(',') : [];
          if (type === 'emulator') {
            name = (await getRunningEmulatorName(device.id)) || name;
          }
          const isKaiOSDevice = Object.keys(props).some(
            (name) => name.startsWith('kaios') || name.startsWith('ro.kaios'),
          );
          const androidLikeDevice = new (isKaiOSDevice
            ? KaiOSDevice
            : AndroidDevice)(
            device.id,
            type,
            name,
            adbClient,
            abiList,
            sdkVersion,
          );
          if (ports) {
            await androidLikeDevice
              .reverse([ports.secure, ports.insecure])
              // We may not be able to establish a reverse connection, e.g. for old Android SDKs.
              // This is *generally* fine, because we hard-code the ports on the SDK side.
              .catch((e) => {
                console.warn(
                  `Failed to reverse-proxy ports on device ${androidLikeDevice.serial}: ${e}`,
                );
              });
          }
          resolve(androidLikeDevice);
        } catch (e) {
          reject(e);
        }
      })
      .catch((e) => {
        if (
          e &&
          e.message &&
          e.message === `Failure: 'device still connecting'`
        ) {
          console.debug('Device still connecting: ' + device.id);
        } else {
          const isAuthorizationError = (e?.message as string)?.includes(
            'device unauthorized',
          );
          store.dispatch(
            addErrorNotification(
              'Could not connect to ' + device.id,
              isAuthorizationError
                ? 'Make sure to authorize debugging on the phone'
                : 'Failed to setup connection',
              e,
            ),
          );
        }
        resolve(undefined); // not ready yet, we will find it in the next tick
      });
  });
}

export async function getActiveAndroidDevices(
  store: Store,
): Promise<Array<BaseDevice>> {
  const client = await getAdbClient(store);
  const androidDevices = await client.listDevices();
  const devices = await Promise.all(
    androidDevices.map((device) => createDevice(client, device, store)),
  );
  return devices.filter(Boolean) as any;
}

function getRunningEmulatorName(
  id: string,
): Promise<string | null | undefined> {
  return new Promise((resolve, reject) => {
    const port = id.replace('emulator-', '');
    // The GNU version of netcat doesn't terminate after 1s when
    // specifying `-w 1`, so we kill it after a timeout. Because
    // of that, even in case of an error, there may still be
    // relevant data for us to parse.
    child_process.exec(
      `echo "avd name" | nc -w 1 localhost ${port}`,
      {timeout: 1000, encoding: 'utf-8'},
      (error: Error | null | undefined, data) => {
        if (data != null && typeof data === 'string') {
          const match = data.trim().match(/(.*)\r\nOK$/);
          resolve(match != null && match.length > 0 ? match[1] : null);
        } else {
          reject(error);
        }
      },
    );
  });
}

export default (store: Store, logger: Logger) => {
  const watchAndroidDevices = () => {
    // get emulators
    promisify(which)('emulator')
      .catch(() => `${process.env.ANDROID_HOME || ''}/tools/emulator`)
      .then((emulatorPath) => {
        child_process.exec(
          `${emulatorPath} -list-avds`,
          (error: Error | null, data: string | null) => {
            if (error != null || data == null) {
              console.error(error || 'Failed to list AVDs');
              return;
            }
            const payload = data.split('\n').filter(Boolean);
            store.dispatch({
              type: 'REGISTER_ANDROID_EMULATORS',
              payload,
            });
          },
        );
      });

    getAdbClient(store)
      .then((client) => {
        client
          .trackDevices()
          .then((tracker) => {
            tracker.on('error', (err) => {
              if (err.message === 'Connection closed') {
                // adb server has shutdown, remove all android devices
                const {connections} = store.getState();
                const deviceIDsToRemove: Array<string> = connections.devices
                  .filter(
                    (device: BaseDevice) => device instanceof AndroidDevice,
                  )
                  .map((device: BaseDevice) => device.serial);

                unregisterDevices(deviceIDsToRemove);
                console.error('adb server was shutdown');
                setTimeout(watchAndroidDevices, 500);
              } else {
                throw err;
              }
            });

            tracker.on('add', async (device) => {
              if (device.type !== 'offline') {
                registerDevice(client, device, store);
              }
            });

            tracker.on('change', async (device) => {
              if (device.type === 'offline') {
                unregisterDevices([device.id]);
              } else {
                registerDevice(client, device, store);
              }
            });

            tracker.on('remove', (device) => {
              unregisterDevices([device.id]);
            });
          })
          .catch((err: {code: string}) => {
            if (err.code === 'ECONNREFUSED') {
              console.warn('adb server not running');
            } else {
              throw err;
            }
          });
      })
      .catch((e) => {
        console.error(`Failed to watch for android devices: ${e.message}`);
      });
  };

  async function registerDevice(adbClient: any, deviceData: any, store: Store) {
    const androidDevice = await createDevice(
      adbClient,
      deviceData,
      store,
      store.getState().application.serverPorts,
    );
    if (!androidDevice) {
      return;
    }
    logger.track('usage', 'register-device', {
      os: 'Android',
      name: androidDevice.title,
      serial: androidDevice.serial,
    });

    // remove offline devices with same serial as the connected.
    const reconnectedDevices = store
      .getState()
      .connections.devices.filter(
        (device: BaseDevice) =>
          device.serial === androidDevice.serial && device.isArchived,
      )
      .map((device) => device.serial);

    store.dispatch({
      type: 'UNREGISTER_DEVICES',
      payload: new Set(reconnectedDevices),
    });

    androidDevice.loadDevicePlugins(store.getState().plugins.devicePlugins);
    store.dispatch({
      type: 'REGISTER_DEVICE',
      payload: androidDevice,
    });

    registerDeviceCallbackOnPlugins(
      store,
      store.getState().plugins.devicePlugins,
      store.getState().plugins.clientPlugins,
      androidDevice,
    );
  }

  async function unregisterDevices(deviceIds: Array<string>) {
    deviceIds.forEach((id) =>
      logger.track('usage', 'unregister-device', {
        os: 'Android',
        serial: id,
      }),
    );

    deviceIds.forEach((id) => {
      const device = store
        .getState()
        .connections.devices.find((device) => device.serial === id);
      device?.disconnect();
    });
  }

  watchAndroidDevices();

  // cleanup method
  return () =>
    getAdbClient(store).then((client) => {
      client.kill();
    });
};

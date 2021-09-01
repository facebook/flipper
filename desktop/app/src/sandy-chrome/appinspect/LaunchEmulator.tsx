/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useEffect, useState} from 'react';
import {Modal, Button, message, Alert, Menu, Dropdown} from 'antd';
import {
  AppleOutlined,
  PoweroffOutlined,
  MoreOutlined,
  AndroidOutlined,
} from '@ant-design/icons';
import {Store} from '../../reducers';
import {useStore} from '../../utils/useStore';
import {launchEmulator} from '../../server/devices/android/AndroidDevice';
import {Layout, renderReactRoot, withTrackingScope} from 'flipper-plugin';
import {Provider} from 'react-redux';
import {
  launchSimulator, // TODO: move to iOSDeviceManager
  IOSDeviceParams,
} from '../../server/devices/ios/iOSDeviceManager';

const COLD_BOOT = 'cold-boot';

export function showEmulatorLauncher(store: Store) {
  renderReactRoot((unmount) => (
    <Provider store={store}>
      <LaunchEmulatorContainer onClose={unmount} />
    </Provider>
  ));
}

function LaunchEmulatorContainer({onClose}: {onClose: () => void}) {
  const flipperServer = useStore((state) => state.connections.flipperServer);
  return (
    <LaunchEmulatorDialog
      onClose={onClose}
      getSimulators={() => flipperServer!.ios.getSimulators(false)}
      getEmulators={() => flipperServer!.android.getAndroidEmulators()}
    />
  );
}

export const LaunchEmulatorDialog = withTrackingScope(
  function LaunchEmulatorDialog({
    onClose,
    getSimulators,
    getEmulators,
  }: {
    onClose: () => void;
    getSimulators: () => Promise<IOSDeviceParams[]>;
    getEmulators: () => Promise<string[]>;
  }) {
    const iosEnabled = useStore((state) => state.settingsState.enableIOS);
    const androidEnabled = useStore(
      (state) => state.settingsState.enableAndroid,
    );
    const [iosEmulators, setIosEmulators] = useState<IOSDeviceParams[]>([]);
    const [androidEmulators, setAndroidEmulators] = useState<string[]>([]);

    const store = useStore();
    useEffect(() => {
      if (!iosEnabled) {
        return;
      }
      getSimulators()
        .then((emulators) => {
          setIosEmulators(
            emulators.filter(
              (device) =>
                device.state === 'Shutdown' &&
                device.deviceTypeIdentifier?.match(/iPhone|iPad/i),
            ),
          );
        })
        .catch((e) => {
          console.warn('Failed to find simulators', e);
        });
    }, [iosEnabled, getSimulators, store]);

    useEffect(() => {
      if (!androidEnabled) {
        return;
      }
      getEmulators()
        .then((emulators) => {
          setAndroidEmulators(emulators);
        })
        .catch((e) => {
          console.warn('Failed to find emulators', e);
        });
    }, [androidEnabled, getEmulators]);

    const items = [
      ...(androidEmulators.length > 0
        ? [<AndroidOutlined key="android logo" />]
        : []),
      ...androidEmulators.map((name) => {
        const launch = (coldBoot: boolean) => {
          launchEmulator(name, coldBoot)
            .then(onClose)
            .catch((e) => {
              console.error('Failed to start emulator: ', e);
              message.error('Failed to start emulator: ' + e);
            });
        };
        const menu = (
          <Menu
            onClick={({key}) => {
              switch (key) {
                case COLD_BOOT: {
                  launch(true);
                  break;
                }
              }
            }}>
            <Menu.Item key={COLD_BOOT} icon={<PoweroffOutlined />}>
              Cold Boot
            </Menu.Item>
          </Menu>
        );
        return (
          <Dropdown.Button
            key={name}
            overlay={menu}
            icon={<MoreOutlined />}
            onClick={() => launch(false)}>
            {name}
          </Dropdown.Button>
        );
      }),
      ...(iosEmulators.length > 0 ? [<AppleOutlined key="ios logo" />] : []),
      ...iosEmulators.map((device) => (
        <Button
          key={device.udid}
          onClick={() =>
            launchSimulator(device.udid)
              .catch((e) => {
                console.error('Failed to start simulator: ', e);
                message.error('Failed to start simulator: ' + e);
              })
              .then(onClose)
          }>
          {device.name}
        </Button>
      )),
    ];

    return (
      <Modal
        visible
        onCancel={onClose}
        title="Launch Emulator"
        footer={null}
        bodyStyle={{maxHeight: 400, overflow: 'auto'}}>
        <Layout.Container gap>
          {items.length ? items : <Alert message="No emulators available" />}
        </Layout.Container>
      </Modal>
    );
  },
);

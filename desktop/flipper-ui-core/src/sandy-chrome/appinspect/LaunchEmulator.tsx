/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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
import {Layout, renderReactRoot, withTrackingScope} from 'flipper-plugin';
import {Provider} from 'react-redux';
import {IOSDeviceParams} from 'flipper-common';
import {getRenderHostInstance} from '../../RenderHost';

const COLD_BOOT = 'cold-boot';

export function showEmulatorLauncher(store: Store) {
  renderReactRoot((unmount) => (
    <Provider store={store}>
      <LaunchEmulatorContainer onClose={unmount} />
    </Provider>
  ));
}

function LaunchEmulatorContainer({onClose}: {onClose: () => void}) {
  return <LaunchEmulatorDialog onClose={onClose} />;
}

export const LaunchEmulatorDialog = withTrackingScope(
  function LaunchEmulatorDialog({onClose}: {onClose: () => void}) {
    const iosEnabled = useStore((state) => state.settingsState.enableIOS);
    const androidEnabled = useStore(
      (state) => state.settingsState.enableAndroid,
    );
    const [iosEmulators, setIosEmulators] = useState<IOSDeviceParams[]>([]);
    const [androidEmulators, setAndroidEmulators] = useState<string[]>([]);

    useEffect(() => {
      if (!iosEnabled) {
        return;
      }
      getRenderHostInstance()
        .flipperServer.exec('ios-get-simulators', false)
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
    }, [iosEnabled]);

    useEffect(() => {
      if (!androidEnabled) {
        return;
      }
      getRenderHostInstance()
        .flipperServer.exec('android-get-emulators')
        .then((emulators) => {
          setAndroidEmulators(emulators);
        })
        .catch((e) => {
          console.warn('Failed to find emulators', e);
        });
    }, [androidEnabled]);

    const items = [
      ...(androidEmulators.length > 0
        ? [<AndroidOutlined key="android logo" />]
        : []),
      ...androidEmulators.map((name) => {
        const launch = (coldBoot: boolean) => {
          getRenderHostInstance()
            .flipperServer.exec('android-launch-emulator', name, coldBoot)
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
            getRenderHostInstance()
              .flipperServer.exec('ios-launch-simulator', device.udid)
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
        centered
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

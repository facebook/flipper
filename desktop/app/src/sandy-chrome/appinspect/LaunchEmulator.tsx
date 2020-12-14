/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useEffect, useState} from 'react';
import {Modal, Button, message, Alert} from 'antd';
import {AndroidOutlined, AppleOutlined} from '@ant-design/icons';
import {Store} from '../../reducers';
import {useStore} from '../../utils/useStore';
import {launchEmulator} from '../../devices/AndroidDevice';
import {Layout, renderReactRoot, withTrackingScope} from 'flipper-plugin';
import {Provider} from 'react-redux';
import {
  launchSimulator,
  getSimulators,
  IOSDeviceParams,
} from '../../dispatcher/iOSDevice';
import GK from '../../fb-stubs/GK';
import {JSEmulatorLauncherSheetSandy} from '../../chrome/JSEmulatorLauncherSheet';

export function showEmulatorLauncher(store: Store) {
  renderReactRoot((unmount) => (
    <Provider store={store}>
      <LaunchEmulatorDialog onClose={unmount} getSimulators={getSimulators} />
    </Provider>
  ));
}

type GetSimulators = typeof getSimulators;

export const LaunchEmulatorDialog = withTrackingScope(
  function LaunchEmulatorDialog({
    onClose,
    getSimulators,
  }: {
    onClose: () => void;
    getSimulators: GetSimulators;
  }) {
    const iosEnabled = useStore((state) => state.settingsState.enableIOS);
    const androidEmulators = useStore((state) =>
      state.settingsState.enableAndroid
        ? state.connections.androidEmulators
        : [],
    );
    const [iosEmulators, setIosEmulators] = useState<IOSDeviceParams[]>([]);

    useEffect(() => {
      if (!iosEnabled) {
        return;
      }
      getSimulators(false).then((emulators) => {
        setIosEmulators(
          emulators.filter(
            (device) =>
              device.state === 'Shutdown' &&
              device.deviceTypeIdentifier?.match(/iPhone|iPad/i),
          ),
        );
      });
    }, [iosEnabled, getSimulators]);

    const items = [
      ...androidEmulators.map((name) => (
        <Button
          key={name}
          icon={<AndroidOutlined />}
          onClick={() =>
            launchEmulator(name)
              .catch((e) => {
                console.error(e);
                message.error('Failed to start emulator: ' + e);
              })
              .then(onClose)
          }>
          {name}
        </Button>
      )),
      ...iosEmulators.map((device) => (
        <Button
          key={device.udid}
          icon={<AppleOutlined />}
          onClick={() =>
            launchSimulator(device.udid)
              .catch((e) => {
                console.error(e);
                message.error('Failed to start simulator: ' + e);
              })
              .then(onClose)
          }>
          {device.name}
        </Button>
      )),
    ];
    // Launch JS emulator
    if (GK.get('flipper_js_client_emulator')) {
      items.push(
        <JSEmulatorLauncherSheetSandy
          key="js-emulator-launcher"
          onClose={onClose}
        />,
      );
    }

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

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
import {
  Layout,
  Spinner,
  renderReactRoot,
  withTrackingScope,
} from 'flipper-plugin';
import {Provider} from 'react-redux';
import {IOSDeviceParams} from 'flipper-common';
import {getRenderHostInstance} from 'flipper-frontend-core';
import SettingsSheet from '../../chrome/SettingsSheet';
import {Link} from '../../ui';

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

function NoSDKsEnabledAlert({onClose}: {onClose: () => void}) {
  const [showSettings, setShowSettings] = useState(false);
  const footer = (
    <>
      <Button onClick={onClose}>Close</Button>
      <Button type="primary" onClick={() => setShowSettings(true)}>
        Open Settings
      </Button>
    </>
  );
  return (
    <>
      <Modal
        visible
        centered
        onCancel={onClose}
        title="No Mobile SDKs Enabled"
        footer={footer}>
        <Layout.Container gap>
          <Alert message="You currently have neither Android nor iOS Development support enabled. To use emulators or simulators, you need to enable at least one in the settings." />
        </Layout.Container>
      </Modal>
      {showSettings && (
        <SettingsSheet
          platform={
            getRenderHostInstance().serverConfig.environmentInfo.os.platform
          }
          onHide={() => setShowSettings(false)}
        />
      )}
    </>
  );
}

export const LaunchEmulatorDialog = withTrackingScope(
  function LaunchEmulatorDialog({onClose}: {onClose: () => void}) {
    const iosEnabled = useStore((state) => state.settingsState.enableIOS);
    const androidEnabled = useStore(
      (state) => state.settingsState.enableAndroid,
    );

    const [iosEmulators, setIosEmulators] = useState<IOSDeviceParams[]>([]);
    const [androidEmulators, setAndroidEmulators] = useState<string[]>([]);
    const [waitingForIos, setWaitingForIos] = useState(iosEnabled);
    const [waitingForAndroid, setWaitingForAndroid] = useState(androidEnabled);
    const waitingForResults = waitingForIos || waitingForAndroid;

    useEffect(() => {
      if (!iosEnabled) {
        return;
      }
      getRenderHostInstance()
        .flipperServer.exec('ios-get-simulators', false)
        .then((emulators) => {
          setWaitingForIos(false);
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
          setWaitingForAndroid(false);
          setAndroidEmulators(emulators);
        })
        .catch((e) => {
          console.warn('Failed to find emulators', e);
        });
    }, [androidEnabled]);

    if (!iosEnabled && !androidEnabled) {
      return <NoSDKsEnabledAlert onClose={onClose} />;
    }

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
                console.warn('Failed to start simulator: ', e);
                message.error('Failed to start simulator: ' + e);
              })
              .then(onClose)
          }>
          {device.name}
        </Button>
      )),
    ];

    const loadingSpinner = (
      <>
        {waitingForResults && <Spinner />}
        {!waitingForResults && items.length === 0 && (
          <Alert
            message={
              <>
                No emulators available. <br />
                <Link href="http://fbflipper.com/docs/getting-started/troubleshooting/general/#i-see-no-emulators-available">
                  Learn more
                </Link>
              </>
            }
          />
        )}
      </>
    );

    return (
      <Modal
        visible
        centered
        onCancel={onClose}
        title="Launch Emulator"
        footer={null}
        bodyStyle={{maxHeight: 400, height: 400, overflow: 'auto'}}>
        <Layout.Container gap>
          {items.length ? items : <></>}
          {loadingSpinner}
        </Layout.Container>
      </Modal>
    );
  },
);

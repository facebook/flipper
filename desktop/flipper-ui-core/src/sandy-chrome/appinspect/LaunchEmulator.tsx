/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useEffect, useState} from 'react';
import {Modal, Button, message, Alert, Menu, Dropdown, Typography} from 'antd';
import {
  PoweroffOutlined,
  MoreOutlined,
  HeartOutlined,
  HeartFilled,
} from '@ant-design/icons';
import {Store} from '../../reducers';
import {useStore} from '../../utils/useStore';
import {
  Layout,
  Spinner,
  renderReactRoot,
  withTrackingScope,
  useLocalStorageState,
  theme,
} from 'flipper-plugin';
import {Provider} from 'react-redux';
import {DeviceTarget} from 'flipper-common';
import {getRenderHostInstance} from 'flipper-frontend-core';
import SettingsSheet from '../../chrome/SettingsSheet';
import {Link} from '../../ui';
import {chain, uniq, without} from 'lodash';
import {ReactNode} from 'react-markdown';

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

    const [iosEmulators, setIosEmulators] = useState<DeviceTarget[]>([]);
    const [androidEmulators, setAndroidEmulators] = useState<string[]>([]);
    const [waitingForIos, setWaitingForIos] = useState(iosEnabled);
    const [waitingForAndroid, setWaitingForAndroid] = useState(androidEnabled);
    const waitingForResults = waitingForIos || waitingForAndroid;

    const [favoriteVirtualDevices, setFavoriteVirtualDevices] =
      useLocalStorageState<string[]>('favourite-virtual-devices', []);

    const addToFavorites = (deviceName: string) => {
      setFavoriteVirtualDevices(uniq([deviceName, ...favoriteVirtualDevices]));
    };

    const removeFromFavorites = (deviceName: string) => {
      setFavoriteVirtualDevices(without(favoriteVirtualDevices, deviceName));
    };

    useEffect(() => {
      if (!iosEnabled) {
        return;
      }
      getRenderHostInstance()
        .flipperServer.exec('ios-get-simulators', false)
        .then((emulators) => {
          setWaitingForIos(false);
          setIosEmulators(emulators);
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
      androidEmulators.length > 0 ? (
        <Title key="android-title" name="Android emulators" />
      ) : null,
      ...chain(
        androidEmulators.map((name) => ({
          name,
          isFavorite: favoriteVirtualDevices.includes(name),
        })),
      )
        .sortBy((item) => [!item.isFavorite, item.name])
        .map(({name, isFavorite}) => {
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
            <VirtualDeviceRow
              key={name}
              addToFavorites={addToFavorites}
              removeFromFavorites={removeFromFavorites}
              isFavorite={isFavorite}
              name={name}>
              <Dropdown.Button
                overlay={menu}
                icon={<MoreOutlined />}
                onClick={() => launch(false)}>
                {name}
              </Dropdown.Button>
            </VirtualDeviceRow>
          );
        })
        .value(),

      iosEmulators.length > 0 ? (
        <Title key="android-title" name="iOS Simulators" />
      ) : null,
      ...chain(iosEmulators)
        .map((device) => ({
          device,
          isFavorite: favoriteVirtualDevices.includes(device.name),
        }))
        .sortBy((item) => [!item.isFavorite, item.device.name])
        .map(({device, isFavorite}) => (
          <VirtualDeviceRow
            key={device.udid}
            addToFavorites={addToFavorites}
            removeFromFavorites={removeFromFavorites}
            isFavorite={isFavorite}
            name={device.name}>
            <Button
              type="default"
              key={device.udid}
              style={{width: '100%'}}
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
              {device.osVersion ? ` (${device.osVersion})` : ''}
            </Button>
          </VirtualDeviceRow>
        ))
        .value(),
    ].filter((item) => item != null);

    const loadingSpinner = (
      <>
        {waitingForResults && <Spinner key="spinner" />}
        {!waitingForResults && items.length === 0 && (
          <Alert
            key=" alert-nodevices"
            message={
              <>
                No virtual devices available.
                <br />
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
        title="Launch Virtual device"
        footer={null}
        bodyStyle={{maxHeight: 400, height: 400, overflow: 'auto'}}>
        <Layout.Container gap="medium">
          {items.length ? items : <></>}
          {loadingSpinner}
        </Layout.Container>
      </Modal>
    );
  },
);

const FavIconStyle = {fontSize: 16, color: theme.primaryColor};

function Title({name}: {name: string}) {
  return (
    <Typography.Title style={{padding: 4}} level={3} key={name}>
      {name}
    </Typography.Title>
  );
}

function VirtualDeviceRow({
  isFavorite,
  name,
  addToFavorites,
  removeFromFavorites,
  children,
}: {
  children: ReactNode;
  isFavorite: boolean;
  name: string;
  addToFavorites: (deviceName: string) => void;
  removeFromFavorites: (deviceName: string) => void;
}) {
  return (
    <Layout.Horizontal gap="medium" center grow key={name}>
      {children}
      {isFavorite ? (
        <HeartFilled
          testing-id="favorite"
          aria-label="favorite"
          onClick={() => {
            removeFromFavorites(name);
          }}
          style={FavIconStyle}
        />
      ) : (
        <HeartOutlined
          testing-id="not-favorite"
          aria-label="not-favorite"
          onClick={() => {
            addToFavorites(name);
          }}
          style={FavIconStyle}
        />
      )}
    </Layout.Horizontal>
  );
}

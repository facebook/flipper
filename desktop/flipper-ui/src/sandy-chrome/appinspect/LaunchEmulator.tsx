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
  getFlipperLib,
} from 'flipper-plugin';
import {Provider} from 'react-redux';
import {DeviceTarget} from 'flipper-common';
import SettingsSheet from '../../chrome/SettingsSheet';
import {Link} from '../../ui';
import {chain, uniq, without} from 'lodash';
import {ReactNode} from 'react-markdown';
import {produce} from 'immer';
import {getFlipperServer, getFlipperServerConfig} from '../../flipperServer';

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
        open
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
          platform={getFlipperServerConfig().environmentInfo.os.platform}
          onHide={() => setShowSettings(false)}
          isFB={getFlipperLib().isFB}
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

    const [iOSMessage, setiOSMessage] = useState<string>('Loading...');
    const [androidMessage, setAndroidMessage] = useState<string>('Loading...');

    const [favoriteVirtualDevices, setFavoriteVirtualDevices] =
      useLocalStorageState<string[]>('favourite-virtual-devices', []);

    const addToFavorites = (deviceName: string) => {
      setFavoriteVirtualDevices(uniq([deviceName, ...favoriteVirtualDevices]));
    };

    const removeFromFavorites = (deviceName: string) => {
      setFavoriteVirtualDevices(without(favoriteVirtualDevices, deviceName));
    };

    const [pendingEmulators, setPendingEmulators] = useState(new Set<string>());

    useEffect(() => {
      const getiOSSimulators = async () => {
        if (!iosEnabled) {
          return;
        }
        setWaitingForIos(true);
        try {
          const simulators = await getFlipperServer().exec(
            'ios-get-simulators',
            false,
          );

          const nonPhysical = simulators.filter(
            (simulator) => simulator.type !== 'physical',
          );
          setWaitingForIos(false);
          setIosEmulators(nonPhysical);
          if (nonPhysical.length === 0) {
            setiOSMessage('No simulators found');
          }
        } catch (error) {
          console.warn('Failed to find iOS simulators', error);
          setiOSMessage(`Error: ${error.message ?? error} \nRetrying...`);
          setTimeout(getiOSSimulators, 1000);
        }
      };

      getiOSSimulators();
    }, [iosEnabled]);

    useEffect(() => {
      const getAndroidEmulators = async () => {
        if (!androidEnabled) {
          return;
        }
        setWaitingForAndroid(true);
        try {
          const emulators = await getFlipperServer().exec(
            'android-get-emulators',
          );
          setWaitingForAndroid(false);
          setAndroidEmulators(emulators);
          if (emulators.length === 0) {
            setAndroidMessage('No emulators found');
          }
        } catch (error) {
          console.warn('Failed to find Android emulators', error);
          setAndroidMessage(`Error: ${error.message ?? error} \nRetrying...`);
          setTimeout(getAndroidEmulators, 1000);
        }
      };

      getAndroidEmulators();
    }, [androidEnabled]);

    if (!iosEnabled && !androidEnabled) {
      return <NoSDKsEnabledAlert onClose={onClose} />;
    }

    let items: (JSX.Element | null)[] = [];
    if (androidEnabled) {
      items.push(
        <Title key="android-title" name="Android emulators" />,
        androidEmulators.length == 0 ? (
          <Typography.Paragraph style={{textAlign: 'center'}}>
            {androidMessage}
          </Typography.Paragraph>
        ) : null,
        ...chain(
          androidEmulators.map((name) => ({
            name,
            isFavorite: favoriteVirtualDevices.includes(name),
          })),
        )
          .sortBy((item) => [!item.isFavorite, item.name])
          .map(({name, isFavorite}) => {
            const launch = async (coldBoot: boolean) => {
              try {
                setPendingEmulators(
                  produce((draft) => {
                    draft.add(name);
                  }),
                );
                await getFlipperServer().exec(
                  'android-launch-emulator',
                  name,
                  coldBoot,
                );
                onClose();
              } catch (e) {
                console.error('Failed to start emulator: ', e);
                message.error(`Failed to start emulator: ${e}`);
              } finally {
                setPendingEmulators(
                  produce((draft) => {
                    draft.delete(name);
                  }),
                );
              }
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
                  loading={pendingEmulators.has(name)}
                  onClick={() => launch(false)}>
                  {name}
                </Dropdown.Button>
              </VirtualDeviceRow>
            );
          })
          .value(),
      );
    }
    if (iosEnabled) {
      items.push(
        <Title key="ios-title" name="iOS Simulators" />,
        iosEmulators.length == 0 ? (
          <Typography.Paragraph style={{textAlign: 'center'}}>
            {iOSMessage}
          </Typography.Paragraph>
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
                loading={pendingEmulators.has(device.udid)}
                onClick={async () => {
                  try {
                    setPendingEmulators(
                      produce((draft) => {
                        draft.add(device.udid);
                      }),
                    );
                    await getFlipperServer().exec(
                      'ios-launch-simulator',
                      device.udid,
                    );
                    onClose();
                  } catch (e) {
                    console.warn('Failed to start simulator: ', e);
                    message.error(`Failed to start simulator: ${e}`);
                  } finally {
                    setPendingEmulators(
                      produce((draft) => {
                        draft.delete(device.udid);
                      }),
                    );
                  }
                }}>
                {device.name}
                {device.osVersion ? ` (${device.osVersion})` : ''}
              </Button>
            </VirtualDeviceRow>
          ))
          .value(),
      );
    }
    items = items.filter((item) => item != null);

    const loadingSpinner =
      waitingForIos || waitingForAndroid ? (
        <Spinner key="spinner" />
      ) : items.length === 0 ? (
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
      ) : null;

    return (
      <Modal
        open
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

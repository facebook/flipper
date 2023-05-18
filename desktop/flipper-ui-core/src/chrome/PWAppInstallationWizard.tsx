/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Modal, Button} from 'antd';
import {getFlipperLib, Layout, _NuxManagerContext} from 'flipper-plugin';
import {getRenderHostInstance} from 'flipper-frontend-core';
import isProduction from '../utils/isProduction';

type Props = {
  onHide: () => void;
};

type TrackerEvents = {
  'pwa-installation-wizard-should-show': {show: boolean; reason: string};
  'pwa-installation-wizard-shown': {};
  'pwa-install-outcome': {
    installed: boolean;
  };
  'pwa-install-error': {
    error: Error;
  };
};

class PWAWizardTracker {
  track<Event extends keyof TrackerEvents>(
    event: Event,
    payload: TrackerEvents[Event],
  ): void {
    getFlipperLib().logger.track('usage', event, payload);
  }
}

const tracker = new PWAWizardTracker();

function isElectron() {
  return !getRenderHostInstance().serverConfig.environmentInfo.isHeadlessBuild;
}

const lastShownTimestampKey = 'flipper-pwa-wizard-last-shown-timestamp';
export function shouldShowPWAInstallationWizard(): boolean {
  if (!isProduction() || isElectron()) {
    return false;
  }

  if (window.matchMedia('(display-mode: standalone)').matches) {
    tracker.track('pwa-installation-wizard-should-show', {
      show: false,
      reason: 'Display mode is standalone, seems is already running as PWA',
    });
    return false;
  }

  let lastShownTimestampFromStorage = undefined;
  try {
    lastShownTimestampFromStorage = window.localStorage.getItem(
      lastShownTimestampKey,
    );
  } catch (e) {}

  if (lastShownTimestampFromStorage) {
    const withinOneDay = (timestamp: number) => {
      const Day = 1 * 24 * 60 * 60 * 1000;
      const DayAgo = Date.now() - Day;

      return timestamp > DayAgo;
    };
    const lastShownTimestamp = Number(lastShownTimestampFromStorage);

    const notShownWithinOneDay = !withinOneDay(lastShownTimestamp);

    tracker.track('pwa-installation-wizard-should-show', {
      show: notShownWithinOneDay,
      reason: 'Last shown timestamp from storage is available',
    });
    return notShownWithinOneDay;
  }

  const lastShownTimestamp = Date.now();
  try {
    window.localStorage.setItem(
      lastShownTimestampKey,
      String(lastShownTimestamp),
    );
  } catch (e) {}

  tracker.track('pwa-installation-wizard-should-show', {
    show: true,
    reason: 'Last shown timestamp from storage is not available',
  });

  return true;
}

async function install(event: any) {
  event.prompt();

  (event.userChoice as any)
    .then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        tracker.track('pwa-install-outcome', {installed: true});
        console.log('PWA installation, user accepted the prompt.');
      } else {
        tracker.track('pwa-install-outcome', {installed: false});
        console.log('PWA installation, user dismissed the prompt.');
      }
      (globalThis as any).PWAppInstallationEvent = null;
    })
    .catch((error: Error) => {
      tracker.track('pwa-install-error', {error});
      console.error('PWA failed to install with error', error);
    });
}

export default function PWAInstallationWizard(props: Props) {
  tracker.track('pwa-installation-wizard-shown', {});
  const contents = (
    <Layout.Container gap>
      <Layout.Container style={{width: '100%', paddingBottom: 15}}>
        <>
          Please install Flipper as a PWA. Installed Progressive Web Apps run in
          a standalone window instead of a browser tab. They're launchable from
          your home screen, dock, taskbar, or shelf. It's possible to search for
          and jump between them with the app switcher, making them feel like
          part of the device they're installed on. New capabilities open up
          after a web app is installed. Keyboard shortcuts, usually reserved
          when running in the browser, become available too.
        </>
      </Layout.Container>
    </Layout.Container>
  );

  const footer = (
    <>
      <Button
        type="ghost"
        onClick={async () => {
          props.onHide();
        }}>
        Not now
      </Button>
      <Button
        type="primary"
        onClick={async () => {
          const installEvent = (globalThis as any).PWAppInstallationEvent;
          if (installEvent) {
            await install(installEvent).then(props.onHide);
          }
        }}>
        Install
      </Button>
    </>
  );

  return (
    <Modal
      visible
      centered
      onCancel={() => {
        props.onHide();
      }}
      width={570}
      title="Install Flipper to Desktop"
      footer={footer}>
      {contents}
    </Modal>
  );
}

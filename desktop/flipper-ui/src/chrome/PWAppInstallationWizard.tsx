/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Image, Button} from 'antd';
import {getFlipperLib, Layout, _NuxManagerContext} from 'flipper-plugin';
import {getFlipperServer} from '../flipperServer';

type TrackerEvents = {
  'pwa-installation-wizard-should-show': {show: boolean; reason: string};
  'pwa-installation-wizard-should-never-show': {};
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

async function install(event: any) {
  event.prompt();

  (event.userChoice as any)
    .then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        tracker.track('pwa-install-outcome', {installed: true});
        console.log('PWA installation, user accepted the prompt.');
        return getFlipperServer().exec('move-pwa');
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

function useStandaloneMode() {
  // Initialize the state based on the current display mode.
  const [isStandalone, setIsStandalone] = React.useState(
    window.matchMedia('(display-mode: standalone)').matches,
  );

  React.useEffect(() => {
    // Create a MediaQueryList object for the standalone display mode.
    const mediaQueryList = window.matchMedia('(display-mode: standalone)');

    // Define a handler for the change event.
    const handleChange = (event: MediaQueryListEvent) => {
      setIsStandalone(event.matches);
    };

    // Add the event listener.
    mediaQueryList.addEventListener('change', handleChange);

    // Clean-up function to remove the event listener.
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, []);

  return isStandalone;
}

export default function PWAInstallationWizard({
  onInstall,
}: {
  onInstall?: () => void;
}) {
  tracker.track('pwa-installation-wizard-shown', {});
  const isPWA = useStandaloneMode();
  React.useEffect(() => {
    if (onInstall && isPWA) {
      onInstall();
    }
  }, [isPWA, onInstall]);
  return (
    <div>
      <Layout.Container gap>
        <Layout.Container style={{width: '100%', paddingBottom: 15}}>
          <p>
            Please install Flipper as a PWA. Installed Progressive Web Apps run
            in a standalone window instead of a browser tab. They're launchable
            from your home screen, dock, taskbar, or shelf. It's possible to
            search for and jump between them with the app switcher, making them
            feel like part of the device they're installed on. New capabilities
            open up after a web app is installed. Keyboard shortcuts, usually
            reserved when running in the browser, become available too.
          </p>
          <p>
            <b>Install it by clicking the 'Install' button below.</b>
          </p>
          <p>
            Alternatively, click on{' '}
            <Image width={18} height={18} src="./install_desktop.svg" /> which
            can be found at the right-side of the search bar next to the
            bookmarks icon.{' '}
          </p>
          {getFlipperLib().isFB && (
            <p>
              Installation instructions can also be found{' '}
              <a
                target="_blank"
                href="https://fb.workplace.com/groups/flipperfyi/permalink/1485547228878234/">
                here
              </a>
              .
            </p>
          )}
        </Layout.Container>
      </Layout.Container>

      <br />

      <div>
        <Button
          type="primary"
          style={{marginLeft: 'auto', display: 'block'}}
          onClick={async () => {
            const installEvent = (globalThis as any).PWAppInstallationEvent;
            if (installEvent) {
              await install(installEvent);
            } else {
              console.warn(
                '[PWA] Installation event was undefined, unable to install',
              );
            }
          }}>
          Install
        </Button>
      </div>
    </div>
  );
}

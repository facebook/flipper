/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import open from 'open';
import {getAuthToken} from '../app-connectivity/certificate-exchange/certificate-utils';
import {findInstallation} from './findInstallation';
import {tracker} from '../tracker';

export enum UIPreference {
  Browser,
  PWA,
}

export async function openUI(preference: UIPreference, port: number) {
  console.info('[flipper-server] Launch UI');

  const token = await getAuthToken();
  console.info(
    `[flipper-server] Get authentication token: ${token?.length != 0}`,
  );

  const openInBrowser = async () => {
    console.info('[flipper-server] Open in browser');
    const url = new URL(`http://localhost:${port}`);

    console.info(`[flipper-server] Go to: ${url.toString()}`);

    try {
      const process = await open(url.toString(), {
        app: {name: open.apps.chrome},
      });
      await new Promise((resolve, reject) => {
        process.on('spawn', resolve);
        process.on('error', reject);
      });
      tracker.track('server-open-ui', {
        browser: true,
        hasToken: token?.length != 0,
      });
    } catch (err: unknown) {
      console.error('[flipper-server] Failed to open browser', err);
    }
  };

  if (preference === UIPreference.Browser) {
    await openInBrowser();
  } else {
    const path = await findInstallation();
    if (path) {
      console.info('[flipper-server] Open in PWA. Location:', path);
      tracker.track('server-open-ui', {
        browser: false,
        hasToken: token?.length != 0,
      });
      open(path);
    } else {
      await openInBrowser();
    }
  }

  console.info('[flipper-server] Launch UI completed');
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createState, DevicePluginClient, CrashLog} from 'flipper-plugin';
import {showCrashNotification} from './crash-utils';

export type Crash = {
  notificationID: string;
  callstack?: string;
  reason: string;
  name: string;
  date: number;
};

export function devicePlugin(client: DevicePluginClient) {
  let notificationID = -1;

  const crashes = createState<Crash[]>([], {persist: 'crashes'});
  const selectedCrash = createState<string | undefined>();

  client.onDeepLink((crashId) => {
    selectedCrash.set(crashId as string);
  });

  function reportCrash(payload: CrashLog) {
    notificationID++;

    const crash = {
      notificationID: notificationID.toString(),
      callstack: payload.callstack,
      name: payload.name,
      reason: payload.reason,
      date: payload.date || Date.now(),
    };

    crashes.update((draft) => {
      draft.push(crash);
    });

    showCrashNotification(client, crash);
  }

  // Startup logic to establish log monitoring
  if (client.device.isConnected) {
    client.onDeviceCrash(reportCrash);
  }

  return {
    crashes,
    selectedCrash,
    reportCrash,
    openInLogs(callstack: string) {
      client.selectPlugin('DeviceLogs', callstack);
    },
    os: client.device.os,
    copyCrashToClipboard(callstack: string) {
      client.writeTextToClipboard(callstack);
    },
    createPaste(callstack: string) {
      client.createPaste(callstack);
    },
    isFB: client.isFB,
    clearCrashes() {
      crashes.set([]);
      selectedCrash.set(undefined);
    },
  };
}

export {Crashes as Component} from './Crashes';

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {FSWatcher} from 'fs';
import {createState, DevicePluginClient} from 'flipper-plugin';
import {showCrashNotification} from './crash-utils';
import {addFileWatcherForiOSCrashLogs} from './ios-crash-utils';
import {startAndroidCrashWatcher} from './android-crash-utils';

export type Crash = {
  notificationID: string;
  callstack?: string;
  reason: string;
  name: string;
  date: Date;
};

export type CrashLog = {
  callstack: string;
  reason: string;
  name: string;
  date?: Date | null;
};

export function devicePlugin(client: DevicePluginClient) {
  let notificationID = -1;
  let watcher: FSWatcher | undefined;

  const crashes = createState<Crash[]>([], {persist: 'crashes'});
  const selectedCrash = createState<string | undefined>();

  client.onDeepLink((crashId) => {
    selectedCrash.set(crashId as string);
  });

  function reportCrash(payload: CrashLog | Crash) {
    notificationID++;

    const crash = {
      notificationID: notificationID.toString(),
      callstack: payload.callstack,
      name: payload.name,
      reason: payload.reason,
      date: payload.date || new Date(),
    };

    crashes.update((draft) => {
      draft.push(crash);
    });

    showCrashNotification(client, crash);
  }

  // Startup logic to establish log monitoring
  if (client.device.isConnected) {
    if (client.device.os.includes('iOS')) {
      watcher = addFileWatcherForiOSCrashLogs(
        client.device.serial,
        reportCrash,
      );
    } else {
      startAndroidCrashWatcher(client, reportCrash);
    }
  }

  client.onDestroy(() => {
    watcher?.close();
  });

  return {
    reportCrash,
    crashes,
    selectedCrash,
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

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ChildProcess} from 'child_process';
import type {IOSDeviceParams} from 'flipper-common';
import path from 'path';
import childProcess from 'child_process';
import {exec} from 'promisify-child-process';
import iosUtil, {IdbConfig} from './iOSContainerUtility';
import IOSDevice from './IOSDevice';
import {
  ERR_NO_IDB_OR_XCODE_AVAILABLE,
  IOSBridge,
  makeIOSBridge,
  SimctlBridge,
} from './IOSBridge';
import {FlipperServerImpl} from '../../FlipperServerImpl';
import {getFlipperServerConfig} from '../../FlipperServerConfig';
import iOSCertificateProvider from './iOSCertificateProvider';
import exitHook from 'exit-hook';

export class IOSDeviceManager {
  private portForwarders: Array<ChildProcess> = [];
  private portforwardingClient = path.join(
    getFlipperServerConfig().paths.staticPath,
    'PortForwardingMacApp.app',
    'Contents',
    'MacOS',
    'PortForwardingMacApp',
  );
  simctlBridge: SimctlBridge = new SimctlBridge();

  readonly certificateProvider: iOSCertificateProvider;

  constructor(
    private readonly flipperServer: FlipperServerImpl,
    private readonly idbConfig: IdbConfig,
  ) {
    this.certificateProvider = new iOSCertificateProvider(this.idbConfig);
  }

  private forwardPort(port: number, multiplexChannelPort: number) {
    const child = childProcess.execFile(
      this.portforwardingClient,
      [`-portForward=${port}`, `-multiplexChannelPort=${multiplexChannelPort}`],
      (err, stdout, stderr) => {
        if (err) {
          // This happens on app reloads and doesn't need to be treated as an error.
          console.warn(
            '[conn] Port forwarding app failed to start',
            err,
            stdout,
            stderr,
          );
        }
      },
    );
    console.info(
      `[conn] Port forwarding app started (portForward: ${port}, multiplexChannelPort: ${multiplexChannelPort})`,
    );
    child.addListener('error', (err) =>
      console.warn('[conn] Port forwarding app error', err),
    );
    child.addListener('exit', (code) => {
      if (code != 0) {
        console.warn(`[conn] Port forwarding app exited with code ${code}`);
      } else {
        console.log(`[conn] Port forwarding app exited gracefully`);
      }
    });

    exitHook(() => {
      child.kill('SIGKILL');
    });

    return child;
  }

  private startDevicePortForwarders(): void {
    if (this.portForwarders.length > 0) {
      // Only ever start them once.
      return;
    }
    // start port forwarding server for real device connections
    // TODO: ports should be picked up from flipperServer.config?
    this.portForwarders = [
      this.forwardPort(8089, 8079),
      this.forwardPort(8088, 8078),
      this.forwardPort(9089, 9079),
      this.forwardPort(9088, 9078),
    ];
  }

  queryDevices(bridge: IOSBridge): Promise<any> {
    return bridge
      .getActiveDevices(true)
      .then((devices) => this.processDevices(bridge, devices));
  }

  private processDevices(bridge: IOSBridge, activeDevices: IOSDeviceParams[]) {
    const currentDeviceIDs = new Set(
      this.flipperServer
        .getDevices()
        .filter((device) => device.info.os === 'iOS')
        .filter((device) => device.info.deviceType !== 'dummy')
        .map((device) => device.serial),
    );

    for (const activeDevice of activeDevices) {
      const {udid, type, name} = activeDevice;
      if (currentDeviceIDs.has(udid)) {
        currentDeviceIDs.delete(udid);
      } else {
        console.info(`[conn] Detected new iOS device ${udid}`, activeDevice);
        const iOSDevice = new IOSDevice(
          this.flipperServer,
          bridge,
          udid,
          type,
          name,
        );
        this.flipperServer.registerDevice(iOSDevice);
      }
    }

    currentDeviceIDs.forEach((id) => {
      console.info(`[conn] Could no longer find ${id}, removing...`);
      this.flipperServer.unregisterDevice(id);
    });
  }

  public async watchIOSDevices() {
    try {
      const isDetected = await iosUtil.isXcodeDetected();
      if (this.idbConfig.enablePhysicalIOS) {
        this.startDevicePortForwarders();
      }
      try {
        // Check for version mismatch now for immediate error handling.
        await this.checkXcodeVersionMismatch();
        // Awaiting the promise here to trigger immediate error handling.
        const bridge = await makeIOSBridge(
          this.idbConfig.idbPath,
          isDetected,
          this.idbConfig.enablePhysicalIOS,
        );
        await this.queryDevicesForever(bridge);
      } catch (err) {
        // This case is expected if both Xcode and idb are missing.
        if (err.message === ERR_NO_IDB_OR_XCODE_AVAILABLE) {
          console.warn(
            'Failed to init iOS device. You may want to disable iOS support in the settings.',
            err,
          );
        } else {
          console.error('Failed to initialize iOS dispatcher:', err);
        }
      }
    } catch (err) {
      console.error('Error while querying iOS devices:', err);
    }
  }

  getSimulators(bootedOnly: boolean): Promise<Array<IOSDeviceParams>> {
    return this.simctlBridge.getActiveDevices(bootedOnly).catch((e: Error) => {
      console.warn('Failed to query simulators:', e);
      if (e.message.includes('Xcode license agreements')) {
        this.flipperServer.emit('notification', {
          type: 'error',
          title: 'Xcode license requires approval',
          description:
            'The Xcode license agreement has changed. You need to either open Xcode and agree to the terms or run `sudo xcodebuild -license` in a Terminal to allow simulators to work with Flipper.',
        });
      }
      return Promise.resolve([]);
    });
  }

  private queryDevicesForever(bridge: IOSBridge) {
    return this.queryDevices(bridge)
      .then(() => {
        // It's important to schedule the next check AFTER the current one has completed
        // to avoid simultaneous queries which can cause multiple user input prompts.
        setTimeout(() => this.queryDevicesForever(bridge), 3000);
      })
      .catch((err) => {
        console.warn('Failed to continuously query devices:', err);
      });
  }

  async checkXcodeVersionMismatch() {
    try {
      const [{stdout: xcodeSelectStdout}, {stdout: simulatorProcessStdout}] =
        await Promise.all([
          exec('xcode-select -p'),
          exec(
            "pgrep Simulator | xargs ps -o command | grep -v grep | grep Simulator.app | awk '{print $1}'",
          ),
        ]);
      const xcodeCLIVersion = xcodeSelectStdout!.toString().trim();
      const runningSimulatorApplications = simulatorProcessStdout!
        .toString()
        .split('\n')
        .filter((application) => application.length > 0);
      const errorMessage = checkXcodeVersionMismatch(
        runningSimulatorApplications,
        xcodeCLIVersion,
      );
      if (errorMessage === undefined) {
        return;
      }
      this.flipperServer.emit('notification', {
        type: 'error',
        title: 'Xcode version mismatch',
        description: errorMessage,
      });
    } catch (e) {
      // This is not an error. It depends on the user's local setup that we cannot influence.
      console.warn('Failed to determine Xcode version:', e);
    }
  }
}

function confirmSimulatorAppMatchesThatOfXcodeSelect(
  runningSimulatorApps: Array<string>,
  xcodeCLIVersion: string,
): string | undefined {
  for (const runningSimulatorApp of runningSimulatorApps) {
    if (!runningSimulatorApp) {
      continue;
    }
    if (runningSimulatorApp.startsWith(xcodeCLIVersion)) {
      continue;
    }
    return (
      runningSimulatorApp.split('/Contents/Developer')[0] +
      '/Contents/Developer'
    );
  }
  return undefined;
}

export function checkXcodeVersionMismatch(
  runningSimulatorApps: Array<string>,
  xcodeCLIVersion: string,
): string | undefined {
  if (runningSimulatorApps.length === 0) {
    return undefined;
  }
  if (xcodeCLIVersion == '/Library/Developer/CommandLineTools') {
    return `A Simulator is running and "xcode-select" has not been used, please run "xcode-select" for the Xcode that is running the simulator at ${runningSimulatorApps}`;
  }
  const mismatchedVersion = confirmSimulatorAppMatchesThatOfXcodeSelect(
    runningSimulatorApps,
    xcodeCLIVersion,
  );
  if (mismatchedVersion === undefined) {
    return;
  }
  return `Xcode version mismatch: Simulator is running from "${mismatchedVersion}" while Xcode CLI is "${xcodeCLIVersion}". Running "xcode-select --switch ${xcodeCLIVersion}" can fix this. For example: "sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"`;
}

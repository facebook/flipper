/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ChildProcess} from 'child_process';
import type {DeviceType} from 'flipper-plugin';
import {promisify} from 'util';
import path from 'path';
import child_process from 'child_process';
const execFile = child_process.execFile;
import iosUtil from './iOSContainerUtility';
import IOSDevice from './IOSDevice';
import {getStaticPath} from '../../../utils/pathUtils';
import {
  ERR_NO_IDB_OR_XCODE_AVAILABLE,
  IOSBridge,
  makeIOSBridge,
} from './IOSBridge';
import {FlipperServer} from '../../FlipperServer';

type iOSSimulatorDevice = {
  state: 'Booted' | 'Shutdown' | 'Shutting Down';
  availability?: string;
  isAvailable?: 'YES' | 'NO' | true | false;
  name: string;
  udid: string;
};

export type IOSDeviceParams = {
  udid: string;
  type: DeviceType;
  name: string;
  deviceTypeIdentifier?: string;
  state?: string;
};

const exec = promisify(child_process.exec);

function isAvailable(simulator: iOSSimulatorDevice): boolean {
  // For some users "availability" is set, for others it's "isAvailable"
  // It's not clear which key is set, so we are checking both.
  // We've also seen isAvailable return "YES" and true, depending on version.
  return (
    simulator.availability === '(available)' ||
    simulator.isAvailable === 'YES' ||
    simulator.isAvailable === true
  );
}

export class IOSDeviceManager {
  private portForwarders: Array<ChildProcess> = [];

  private portforwardingClient = getStaticPath(
    path.join(
      'PortForwardingMacApp.app',
      'Contents',
      'MacOS',
      'PortForwardingMacApp',
    ),
  );
  iosBridge: IOSBridge | undefined;
  private xcodeVersionMismatchFound = false;
  public xcodeCommandLineToolsDetected = false;

  constructor(private flipperServer: FlipperServer) {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.portForwarders.forEach((process) => process.kill());
      });
    }
  }

  private forwardPort(port: number, multiplexChannelPort: number) {
    const childProcess = execFile(
      this.portforwardingClient,
      [`-portForward=${port}`, `-multiplexChannelPort=${multiplexChannelPort}`],
      (err, stdout, stderr) => {
        // This happens on app reloads and doesn't need to be treated as an error.
        console.warn(
          'Port forwarding app failed to start',
          err,
          stdout,
          stderr,
        );
      },
    );
    console.log('Port forwarding app started', childProcess);
    childProcess.addListener('error', (err) =>
      console.warn('Port forwarding app error', err),
    );
    childProcess.addListener('exit', (code) =>
      console.log(`Port forwarding app exited with code ${code}`),
    );
    return childProcess;
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
    ];
  }

  getAllPromisesForQueryingDevices(
    isXcodeDetected: boolean,
  ): Array<Promise<any>> {
    const {config} = this.flipperServer;
    const promArray = [
      getActiveDevices(config.idbPath, config.enablePhysicalIOS).then(
        (devices: IOSDeviceParams[]) => {
          this.processDevices(devices, 'physical');
        },
      ),
    ];
    if (isXcodeDetected) {
      promArray.push(
        ...[
          this.checkXcodeVersionMismatch(),
          this.getSimulators(true).then((devices) => {
            this.processDevices(devices, 'emulator');
          }),
        ],
      );
    }
    return promArray;
  }

  private async queryDevices(): Promise<any> {
    const isXcodeInstalled = await iosUtil.isXcodeDetected();
    return Promise.all(this.getAllPromisesForQueryingDevices(isXcodeInstalled));
  }

  private processDevices(
    activeDevices: IOSDeviceParams[],
    targetType: 'physical' | 'emulator',
  ) {
    if (!this.iosBridge) {
      throw new Error('iOS bridge not yet initialized');
    }
    const currentDeviceIDs = new Set(
      this.flipperServer
        .getDevices()
        .filter(
          (device) => device.os === 'iOS' && device.deviceType === targetType,
        )
        .map((device) => device.serial),
    );

    for (const {udid, type, name} of activeDevices) {
      if (currentDeviceIDs.has(udid)) {
        currentDeviceIDs.delete(udid);
      } else if (targetType === type) {
        console.log(`[conn] detected new iOS device ${targetType} ${udid}`);
        const iOSDevice = new IOSDevice(this.iosBridge, udid, type, name);
        this.flipperServer.registerDevice(iOSDevice);
      }
    }

    currentDeviceIDs.forEach((id) => {
      console.log(
        `[conn] Could no longer find ${targetType} ${id}, removing...`,
      );
      this.flipperServer.unregisterDevice(id);
    });
  }

  public async watchIOSDevices() {
    // TODO: pull this condition up
    if (!this.flipperServer.config.enableIOS) {
      return;
    }
    try {
      const isDetected = await iosUtil.isXcodeDetected();
      this.xcodeCommandLineToolsDetected = isDetected;
      if (this.flipperServer.config.enablePhysicalIOS) {
        this.startDevicePortForwarders();
      }
      try {
        // Awaiting the promise here to trigger immediate error handling.
        this.iosBridge = await makeIOSBridge(
          this.flipperServer.config.idbPath,
          isDetected,
        );
        this.queryDevicesForever();
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
    return promisify(execFile)(
      'xcrun',
      ['simctl', ...getDeviceSetPath(), 'list', 'devices', '--json'],
      {
        encoding: 'utf8',
      },
    )
      .then(({stdout}) => JSON.parse(stdout).devices)
      .then((simulatorDevices: Array<iOSSimulatorDevice>) => {
        const simulators = Object.values(simulatorDevices).flat();
        return simulators
          .filter(
            (simulator) =>
              (!bootedOnly || simulator.state === 'Booted') &&
              isAvailable(simulator),
          )
          .map((simulator) => {
            return {
              ...simulator,
              type: 'emulator',
            } as IOSDeviceParams;
          });
      })
      .catch((e: Error) => {
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

  private queryDevicesForever() {
    return this.queryDevices()
      .then(() => {
        // It's important to schedule the next check AFTER the current one has completed
        // to avoid simultaneous queries which can cause multiple user input prompts.
        setTimeout(() => this.queryDevicesForever(), 3000);
      })
      .catch((err) => {
        console.warn('Failed to continuously query devices:', err);
      });
  }

  async checkXcodeVersionMismatch() {
    if (this.xcodeVersionMismatchFound) {
      return;
    }
    try {
      let {stdout: xcodeCLIVersion} = await exec('xcode-select -p');
      xcodeCLIVersion = xcodeCLIVersion.trim();
      const {stdout} = await exec('ps aux | grep CoreSimulator');
      for (const line of stdout.split('\n')) {
        const match = parseXcodeFromCoreSimPath(line);
        const runningVersion =
          match && match.length > 0 ? match[0].trim() : null;
        if (runningVersion && runningVersion !== xcodeCLIVersion) {
          const errorMessage = `Xcode version mismatch: Simulator is running from "${runningVersion}" while Xcode CLI is "${xcodeCLIVersion}". Running "xcode-select --switch ${runningVersion}" can fix this. For example: "sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"`;
          this.flipperServer.emit('notification', {
            type: 'error',
            title: 'Xcode version mismatch',
            description: '' + errorMessage,
          });
          this.xcodeVersionMismatchFound = true;
          break;
        }
      }
    } catch (e) {
      console.error('Failed to determine Xcode version:', e);
    }
  }
}

function getDeviceSetPath() {
  return process.env.DEVICE_SET_PATH
    ? ['--set', process.env.DEVICE_SET_PATH]
    : [];
}

export async function launchSimulator(udid: string): Promise<any> {
  await promisify(execFile)(
    'xcrun',
    ['simctl', ...getDeviceSetPath(), 'boot', udid],
    {encoding: 'utf8'},
  );
  await promisify(execFile)('open', ['-a', 'simulator']);
}

function getActiveDevices(
  idbPath: string,
  isPhysicalDeviceEnabled: boolean,
): Promise<Array<IOSDeviceParams>> {
  return iosUtil.targets(idbPath, isPhysicalDeviceEnabled).catch((e) => {
    console.error('Failed to get active iOS devices:', e.message);
    return [];
  });
}

export function parseXcodeFromCoreSimPath(
  line: string,
): RegExpMatchArray | null {
  return line.match(/\/[\/\w@)(\-\+]*\/Xcode[^/]*\.app\/Contents\/Developer/);
}

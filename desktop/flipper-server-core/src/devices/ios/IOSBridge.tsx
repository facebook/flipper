/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs-extra';
import iosUtil from './iOSContainerUtility';

import child_process from 'child_process';
import type {IOSDeviceParams} from 'flipper-common';
import {DeviceType} from 'flipper-common';
import {v1 as uuid} from 'uuid';
import path from 'path';
import {exec, execFile} from 'promisify-child-process';
import {getFlipperServerConfig} from '../../FlipperServerConfig';

export const ERR_NO_IDB_OR_XCODE_AVAILABLE =
  'Neither Xcode nor idb available. Cannot provide iOS device functionality.';

export const ERR_PHYSICAL_DEVICE_LOGS_WITHOUT_IDB =
  'Cannot provide logs from a physical device without idb.';

// eslint-disable-next-line @typescript-eslint/naming-convention
type iOSSimulatorDevice = {
  state: 'Booted' | 'Shutdown' | 'Shutting Down';
  availability?: string;
  isAvailable?: 'YES' | 'NO' | true | false;
  name: string;
  udid: string;
};

export interface IOSBridge {
  startLogListener: (
    udid: string,
    deviceType: DeviceType,
  ) => child_process.ChildProcessWithoutNullStreams;
  screenshot: (serial: string) => Promise<Buffer>;
  navigate: (serial: string, location: string) => Promise<void>;
  recordVideo: (
    serial: string,
    outputFile: string,
  ) => child_process.ChildProcess;
  getActiveDevices: (bootedOnly: boolean) => Promise<Array<IOSDeviceParams>>;
}

export class IDBBridge implements IOSBridge {
  constructor(
    private idbPath: string,
    private enablePhysicalDevices: boolean,
  ) {}
  async getActiveDevices(_bootedOnly: boolean): Promise<IOSDeviceParams[]> {
    return iosUtil
      .targets(this.idbPath, this.enablePhysicalDevices)
      .catch((e) => {
        console.error('Failed to get active iOS devices:', e.message);
        return [];
      });
  }

  async navigate(serial: string, location: string): Promise<void> {
    this._execIdb(`open --udid ${serial} "${location}"`);
  }

  recordVideo(serial: string, outputFile: string): child_process.ChildProcess {
    console.log(`Starting screen record via idb to ${outputFile}.`);
    return this._execIdb(`record-video --udid ${serial} ${outputFile}`);
  }

  async screenshot(serial: string): Promise<Buffer> {
    const imagePath = makeTempScreenshotFilePath();
    await this._execIdb(`screenshot --udid ${serial} ${imagePath}`);
    return readScreenshotIntoBuffer(imagePath);
  }

  startLogListener(
    udid: string,
    deviceType: DeviceType,
  ): child_process.ChildProcessWithoutNullStreams {
    return child_process.spawn(
      this.idbPath,
      ['log', '--udid', udid, '--', ...getLogExtraArgs(deviceType)],
      {
        env: {
          PYTHONUNBUFFERED: '1',
        },
      },
    );
  }

  _execIdb(command: string): child_process.ChildProcess {
    return exec(`${this.idbPath} ${command}`);
  }
}

export class SimctlBridge implements IOSBridge {
  startLogListener(
    udid: string,
    deviceType: DeviceType,
  ): child_process.ChildProcessWithoutNullStreams {
    if (deviceType === 'physical') {
      throw new Error(ERR_PHYSICAL_DEVICE_LOGS_WITHOUT_IDB);
    }
    const deviceSetPath = process.env.DEVICE_SET_PATH
      ? ['--set', process.env.DEVICE_SET_PATH]
      : [];
    return child_process.spawn(
      'xcrun',
      [
        'simctl',
        ...deviceSetPath,
        'spawn',
        udid,
        'log',
        'stream',
        ...getLogExtraArgs(deviceType),
      ],
      {},
    );
  }

  async screenshot(serial: string): Promise<Buffer> {
    const imagePath = makeTempScreenshotFilePath();
    await exec(`xcrun simctl io ${serial} screenshot ${imagePath}`);
    return readScreenshotIntoBuffer(imagePath);
  }

  async navigate(serial: string, location: string): Promise<void> {
    exec(`xcrun simctl io ${serial} launch url "${location}"`);
  }

  recordVideo(serial: string, outputFile: string): child_process.ChildProcess {
    console.log(`Starting screen record via xcrun to ${outputFile}.`);
    return exec(
      `xcrun simctl io ${serial} recordVideo --codec=h264 --force ${outputFile}`,
    );
  }

  async getActiveDevices(bootedOnly: boolean): Promise<Array<IOSDeviceParams>> {
    return execFile('xcrun', [
      'simctl',
      ...getDeviceSetPath(),
      'list',
      'devices',
      '--json',
    ])
      .then(({stdout}) => JSON.parse(stdout!.toString()).devices)
      .then((simulatorDevices: Array<iOSSimulatorDevice>) => {
        const simulators = Object.values(simulatorDevices).flat();
        return simulators
          .filter(
            (simulator) =>
              (!bootedOnly || simulator.state === 'Booted') &&
              isSimulatorAvailable(simulator),
          )
          .map((simulator) => {
            return {
              ...simulator,
              type: 'emulator',
            } as IOSDeviceParams;
          });
      });
  }

  async launchSimulator(udid: string): Promise<any> {
    await execFile('xcrun', ['simctl', ...getDeviceSetPath(), 'boot', udid]);
    await execFile('open', ['-a', 'simulator']);
  }
}

function isSimulatorAvailable(simulator: iOSSimulatorDevice): boolean {
  // For some users "availability" is set, for others it's "isAvailable"
  // It's not clear which key is set, so we are checking both.
  // We've also seen isAvailable return "YES" and true, depending on version.
  return (
    simulator.availability === '(available)' ||
    simulator.isAvailable === 'YES' ||
    simulator.isAvailable === true
  );
}

async function isAvailable(idbPath: string): Promise<boolean> {
  if (!idbPath) {
    return false;
  }
  return fs.promises
    .access(idbPath, fs.constants.X_OK)
    .then((_) => true)
    .catch((_) => false);
}

function getLogExtraArgs(deviceType: DeviceType) {
  if (deviceType === 'physical') {
    return [
      // idb has a --json option, but that doesn't actually work for physical
      // devices!
    ];
  } else {
    return [
      '--style',
      'json',
      '--predicate',
      'senderImagePath contains "Containers"',
      '--debug',
      '--info',
    ];
  }
}

function makeTempScreenshotFilePath() {
  const imageName = uuid() + '.png';
  return path.join(getFlipperServerConfig().paths.tempPath, imageName);
}

async function readScreenshotIntoBuffer(imagePath: string): Promise<Buffer> {
  const buffer = await fs.readFile(imagePath);
  await fs.unlink(imagePath);
  return buffer;
}

export function getDeviceSetPath() {
  return process.env.DEVICE_SET_PATH
    ? ['--set', process.env.DEVICE_SET_PATH]
    : [];
}

export async function makeIOSBridge(
  idbPath: string,
  isXcodeDetected: boolean,
  enablePhysicalDevices: boolean,
  isAvailableFn: (idbPath: string) => Promise<boolean> = isAvailable,
): Promise<IOSBridge> {
  // prefer idb
  if (await isAvailableFn(idbPath)) {
    return new IDBBridge(idbPath, enablePhysicalDevices);
  }

  // no idb, if it's a simulator and xcode is available, we can use xcrun
  if (isXcodeDetected) {
    return new SimctlBridge();
  }

  throw new Error(ERR_NO_IDB_OR_XCODE_AVAILABLE);
}

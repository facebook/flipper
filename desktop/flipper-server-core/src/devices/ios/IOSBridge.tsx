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
import {DeviceType, uuid} from 'flipper-common';
import path from 'path';
import {ChildProcessPromise, exec, execFile} from 'promisify-child-process';
import {getFlipperServerConfig} from '../../FlipperServerConfig';
import iOSContainerUtility from './iOSContainerUtility';
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

// https://fbidb.io/docs/commands#list-apps
interface IOSInstalledAppDescriptor {
  bundleID: string;
  name: string;
  installType: 'user' | 'user_development' | 'system';
  architectures: string[];
  runningStatus: 'Unknown' | 'Running';
  debuggableStatus: boolean;
}

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
  installApp: (
    serial: string,
    ipaPath: string,
    tempPath: string,
  ) => Promise<void>;
  getInstalledApps: (serial: string) => Promise<IOSInstalledAppDescriptor[]>;
  ls: (serial: string, appBundleId: string, path: string) => Promise<string[]>;
  pull: (
    serial: string,
    src: string,
    bundleId: string,
    dst: string,
  ) => Promise<void>;
}

export class IDBBridge implements IOSBridge {
  constructor(
    private idbPath: string,
    private enablePhysicalDevices: boolean,
  ) {}

  async getInstalledApps(serial: string): Promise<IOSInstalledAppDescriptor[]> {
    const {stdout} = await this._execIdb(`list-apps --udid ${serial}`);
    if (typeof stdout !== 'string') {
      throw new Error(
        `IDBBridge.getInstalledApps -> returned ${typeof stdout}, not a string`,
      );
    }
    // Skip last item, as the last line also has \n at the end
    const appStrings = stdout.split('\n').slice(0, -1);
    const appDescriptors = appStrings.map(
      (appString): IOSInstalledAppDescriptor => {
        const [
          bundleID,
          name,
          installType,
          architecturesString,
          runningStatus,
          debuggableStatusString,
        ] = appString.split(' | ');
        return {
          bundleID,
          name,
          installType: installType as IOSInstalledAppDescriptor['installType'],
          architectures: architecturesString.split(', '),
          runningStatus:
            runningStatus as IOSInstalledAppDescriptor['runningStatus'],
          debuggableStatus: debuggableStatusString !== 'Not Debuggable',
        };
      },
    );
    return appDescriptors;
  }

  async ls(
    serial: string,
    appBundleId: string,
    path: string,
  ): Promise<string[]> {
    const {stdout} = await this._execIdb(
      `file ls --udid ${serial} --log ERROR --bundle-id ${appBundleId} '${path}'`,
    );
    if (typeof stdout !== 'string') {
      throw new Error(
        `IDBBridge.ls -> returned ${typeof stdout}, not a string`,
      );
    }
    // Skip last item, as the last line also has \n at the end
    const pathContent = stdout.split('\n').slice(0, -1);
    return pathContent;
  }

  pull(
    serial: string,
    src: string,
    bundleId: string,
    dst: string,
  ): Promise<void> {
    return iOSContainerUtility.pull(serial, src, bundleId, dst, this.idbPath);
  }

  async installApp(serial: string, ipaPath: string): Promise<void> {
    console.log(`Installing app via IDB ${ipaPath} ${serial}`);
    await this._execIdb(`install ${ipaPath} --udid ${serial}`);
  }

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

  _execIdb(command: string): ChildProcessPromise {
    return exec(`${this.idbPath} ${command}`);
  }
}

export class SimctlBridge implements IOSBridge {
  pull(
    serial: string,
    src: string,
    bundleId: string,
    dst: string,
  ): Promise<void> {
    return iOSContainerUtility.pull(serial, src, bundleId, dst, '');
  }

  async getInstalledApps(
    _serial: string,
  ): Promise<IOSInstalledAppDescriptor[]> {
    // TODO: Implement me
    throw new Error(
      'SimctlBridge does not support getInstalledApps. Install IDB (https://fbidb.io/).',
    );
  }

  async ls(_serial: string, _appBundleId: string): Promise<string[]> {
    // TODO: Implement me
    throw new Error(
      'SimctlBridge does not support ls.  Install IDB (https://fbidb.io/).',
    );
  }

  async installApp(
    serial: string,
    ipaPath: string,
    tempPath: string,
  ): Promise<void> {
    console.log(`Installing  app ${ipaPath} with xcrun`);
    const buildName = path.parse(ipaPath).name;

    const extractTmpDir = path.join(tempPath, `${buildName}-extract`, uuid());

    try {
      await fs.mkdirp(extractTmpDir);
      await unzip(ipaPath, extractTmpDir);
      await exec(
        `xcrun simctl install ${serial} ${path.join(
          extractTmpDir,
          'Payload',
          '*.app',
        )}`,
      );
    } finally {
      await fs.rmdir(extractTmpDir, {recursive: true});
    }
  }

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

async function unzip(filePath: string, destination: string): Promise<void> {
  //todo this probably shouldn't involve shelling out...
  await exec(`unzip -qq  -o ${filePath} -d ${destination}`);
  if (!(await fs.pathExists(path.join(destination, 'Payload')))) {
    throw new Error(
      `${path.join(destination, 'Payload')} Directory does not exists`,
    );
  }
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

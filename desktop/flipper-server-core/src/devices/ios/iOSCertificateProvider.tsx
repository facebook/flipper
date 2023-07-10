/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import CertificateProvider from '../../app-connectivity/certificate-exchange/CertificateProvider';
import iosUtil, {IdbConfig} from './iOSContainerUtility';
import fs from 'fs-extra';
import {promisify} from 'util';
import tmp, {DirOptions} from 'tmp';
import {
  csrFileName,
  extractBundleIdFromCSR,
} from '../../app-connectivity/certificate-exchange/certificate-utils';
import path from 'path';

const tmpDir = promisify(tmp.dir) as (options?: DirOptions) => Promise<string>;

const logTag = 'iOSCertificateProvider';

// eslint-disable-next-line @typescript-eslint/naming-convention
export default class iOSCertificateProvider extends CertificateProvider {
  name = 'iOSCertificateProvider';
  medium = 'FS_ACCESS' as const;
  constructor(private idbConfig: IdbConfig) {
    super();
  }

  async getTargetDeviceId(
    appName: string,
    appDirectory: string,
    csr: string,
  ): Promise<string> {
    const matches = /\/Devices\/([^/]+)\//.exec(appDirectory);
    if (matches && matches.length == 2) {
      // It's a simulator, the device identifier is in the filepath.
      return matches[1];
    }

    // Get all available targets
    const targets = await iosUtil.targets(
      this.idbConfig.idbPath,
      this.idbConfig.enablePhysicalIOS,
    );
    if (targets.length === 0) {
      throw new Error('No iOS devices found');
    }
    const deviceMatchList = targets.map(async (target) => {
      try {
        const isMatch = await this.iOSDeviceHasMatchingCSR(
          appDirectory,
          target.udid,
          appName,
          csr,
        );
        return {id: target.udid, isMatch};
      } catch (e) {
        console.info(
          `[conn] Unable to check for matching CSR in ${target.udid}:${appName}`,
          logTag,
          e,
        );
        return {id: target.udid, isMatch: false};
      }
    });
    const devices = await Promise.all(deviceMatchList);
    const matchingIds = devices.filter((m) => m.isMatch).map((m) => m.id);
    if (matchingIds.length == 0) {
      throw new Error(`No matching device found for app: ${appName}`);
    }
    if (matchingIds.length > 1) {
      console.warn(`[conn] Multiple devices found for app: ${appName}`);
    }
    return matchingIds[0];
  }

  protected async deployOrStageFileForDevice(
    destination: string,
    filename: string,
    contents: string,
    csr: string,
  ) {
    console.debug('[conn] Deploying file to device ', {
      destination,
      filename,
    });
    const bundleId = await extractBundleIdFromCSR(csr);
    try {
      await fs.writeFile(destination + filename, contents);
    } catch (err) {
      console.debug(
        '[conn] Deploying file using idb as physical device is inferred',
      );
      const relativePathInsideApp =
        this.getRelativePathInAppContainer(destination);

      console.debug(`[conn] Relative path '${relativePathInsideApp}'`);

      const udid = await this.getTargetDeviceId(bundleId, destination, csr);
      await this.pushFileToiOSDevice(
        udid,
        bundleId,
        relativePathInsideApp,
        filename,
        contents,
      );
    }

    console.debug('[conn] Deploying file to device complete');
  }

  private getRelativePathInAppContainer(absolutePath: string) {
    const matches = /Application\/[^/]+\/(.*)/.exec(absolutePath);
    if (matches && matches.length === 2) {
      return matches[1];
    }
    throw new Error("Path didn't match expected pattern: " + absolutePath);
  }

  private async pushFileToiOSDevice(
    udid: string,
    bundleId: string,
    destination: string,
    filename: string,
    contents: string,
  ): Promise<void> {
    const dir = await tmpDir({unsafeCleanup: true});
    const src = path.resolve(dir, filename);
    await fs.writeFile(src, contents);

    await iosUtil.push(
      udid,
      src,
      bundleId,
      destination,
      this.idbConfig.idbPath,
    );
  }

  private async iOSDeviceHasMatchingCSR(
    directory: string,
    deviceId: string,
    bundleId: string,
    csr: string,
  ): Promise<boolean> {
    const src = this.getRelativePathInAppContainer(
      path.resolve(directory, csrFileName),
    );
    const dst = await tmpDir({unsafeCleanup: true});

    try {
      await iosUtil.pull(deviceId, src, bundleId, dst, this.idbConfig.idbPath);
    } catch (e) {
      console.warn(
        `[conn] Original idb pull failed. Most likely it is a physical device
        that requires us to handle the dest path dirrently.
        Forcing a re-try with the updated dest path. See D32106952 for details.`,
        e,
      );
      await iosUtil.pull(
        deviceId,
        src,
        bundleId,
        path.join(dst, csrFileName),
        this.idbConfig.idbPath,
      );
      console.info(
        '[conn] Subsequent idb pull succeeded. Nevermind previous wranings.',
      );
    }

    const items = await fs.readdir(dst);
    if (items.length > 1) {
      throw new Error('Conflict in temporary dir');
    }
    if (items.length === 0) {
      throw new Error('No CSR found on device');
    }

    const filename = items[0];
    const pulledFile = path.resolve(dst, filename);

    console.debug(`[conn] Read CSR from '${pulledFile}'`);

    const data = await fs.readFile(pulledFile);
    const csrFromDevice = this.santitizeString(data.toString());
    return csrFromDevice === this.santitizeString(csr);
  }
}

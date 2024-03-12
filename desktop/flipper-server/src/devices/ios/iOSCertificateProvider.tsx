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
import {ClientQuery} from 'flipper-common';
import {recorder} from '../../recorder';
import {isFBBuild} from '../../fb-stubs/constants';

const tmpDir = promisify(tmp.dir) as (options?: DirOptions) => Promise<string>;

// eslint-disable-next-line @typescript-eslint/naming-convention
export default class iOSCertificateProvider extends CertificateProvider {
  name = 'iOSCertificateProvider';
  medium = 'FS_ACCESS' as const;
  constructor(private idbConfig: IdbConfig) {
    super();
  }

  async getTargetDeviceId(
    clientQuery: ClientQuery,
    appName: string,
    appDirectory: string,
    csr: string,
  ): Promise<string> {
    const matches = /\/Devices\/([^/]+)\//.exec(appDirectory);
    if (matches && matches.length == 2) {
      // It's a simulator, the device identifier is in the filepath.
      return matches[1];
    }

    recorder.log(clientQuery, 'Query available devices');
    const targets = await iosUtil.targets(
      this.idbConfig.idbPath,
      this.idbConfig.enablePhysicalIOS,
      true,
      clientQuery,
    );
    if (targets.length === 0) {
      recorder.logError(clientQuery, 'No devices found');
      throw new Error('No iOS devices found');
    }
    let isPhysicalDevice = false;
    const deviceMatchList = targets.map(async (target) => {
      try {
        const isMatch = await this.iOSDeviceHasMatchingCSR(
          clientQuery,
          appDirectory,
          target.udid,
          appName,
          csr,
        );
        if (!isPhysicalDevice) {
          isPhysicalDevice = target.type === 'physical';
        }
        return {id: target.udid, isMatch};
      } catch (e) {
        recorder.logError(
          clientQuery,
          'Unable to find a matching device for the incoming request',
        );
        return {id: target.udid, isMatch: false};
      }
    });
    const devices = await Promise.all(deviceMatchList);
    const matchingIds = devices.filter((m) => m.isMatch).map((m) => m.id);
    if (matchingIds.length == 0) {
      let error = `No matching device found for app: ${appName}.`;
      if (clientQuery.medium === 'FS_ACCESS' && isPhysicalDevice && isFBBuild) {
        error += ` If you are using a physical device and a non-locally built app (i.e. Mobile Build), please make sure WWW certificate exchange is enabled in your app.`;
      }

      throw new Error(error);
    }
    if (matchingIds.length > 1) {
      console.warn(`[conn] Multiple devices found for app: ${appName}`);
    }
    return matchingIds[0];
  }

  protected async deployOrStageFileForDevice(
    clientQuery: ClientQuery,
    destination: string,
    filename: string,
    contents: string,
    csr: string,
  ) {
    recorder.log(
      clientQuery,
      `Deploying file '${filename}' to device at '${destination}'`,
    );

    const bundleId = await extractBundleIdFromCSR(csr);
    try {
      await fs.writeFile(destination + filename, contents);
    } catch (err) {
      const relativePathInsideApp =
        this.getRelativePathInAppContainer(destination);

      const udid = await this.getTargetDeviceId(
        clientQuery,
        bundleId,
        destination,
        csr,
      );
      await this.pushFileToiOSDevice(
        clientQuery,
        udid,
        bundleId,
        relativePathInsideApp,
        filename,
        contents,
      );
    }
  }

  private getRelativePathInAppContainer(absolutePath: string) {
    const matches = /Application\/[^/]+\/(.*)/.exec(absolutePath);
    if (matches && matches.length === 2) {
      return matches[1];
    }
    throw new Error(`Path didn't match expected pattern: ${absolutePath}`);
  }

  private async pushFileToiOSDevice(
    clientQuery: ClientQuery,
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
      clientQuery,
    );
  }

  private async iOSDeviceHasMatchingCSR(
    clientQuery: ClientQuery,
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
      await iosUtil.pull(
        deviceId,
        src,
        bundleId,
        dst,
        this.idbConfig.idbPath,
        clientQuery,
      );
    } catch (e) {
      recorder.log(
        clientQuery,
        `Original idb pull failed. Most likely it is a physical device
        that requires us to handle the destination path dirrently.
        Forcing a re-try with the updated destination path. See D32106952 for details.`,
        e,
      );
      await iosUtil.pull(
        deviceId,
        src,
        bundleId,
        path.join(dst, csrFileName),
        this.idbConfig.idbPath,
        clientQuery,
      );
      recorder.log(
        clientQuery,
        'Subsequent idb pull succeeded. Nevermind previous warnings.',
      );
    }

    const items = await fs.readdir(dst);
    if (items.length > 1) {
      throw new Error('Conflict in temporary directory');
    }
    if (items.length === 0) {
      throw new Error('No CSR found on device');
    }

    const filename = items[0];
    const filepath = path.resolve(dst, filename);

    recorder.log(clientQuery, `Read CSR from: '${filepath}'`);

    const data = await fs.readFile(filepath);
    const csrFromDevice = this.santitizeString(data.toString());

    return csrFromDevice === this.santitizeString(csr);
  }
}

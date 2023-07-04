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
  extractAppNameFromCSR,
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
      // It's a simulator, the deviceId is in the filepath.
      return matches[1];
    }
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
          `Unable to check for matching CSR in ${target.udid}:${appName}`,
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
      console.warn(`Multiple devices found for app: ${appName}`);
    }
    return matchingIds[0];
  }

  protected async deployOrStageFileForDevice(
    destination: string,
    filename: string,
    contents: string,
    csr: string,
  ) {
    console.debug('iOSCertificateProvider.deployOrStageFileForDevice', {
      destination,
      filename,
    });
    const appName = await extractAppNameFromCSR(csr);
    try {
      await fs.writeFile(destination + filename, contents);
    } catch (err) {
      // Writing directly to FS failed. It's probably a physical device.
      console.debug(
        'iOSCertificateProvider.deployOrStageFileForDevice -> physical device',
      );
      const relativePathInsideApp =
        this.getRelativePathInAppContainer(destination);

      console.debug(
        'iOSCertificateProvider.deployOrStageFileForDevice: realtive path',
        relativePathInsideApp,
      );

      const udid = await this.getTargetDeviceId(appName, destination, csr);
      await this.pushFileToiOSDevice(
        udid,
        appName,
        relativePathInsideApp,
        filename,
        contents,
      );
    }

    console.debug('iOSCertificateProvider.deployOrStageFileForDevice -> done');
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
    const filePath = path.resolve(dir, filename);
    await fs.writeFile(filePath, contents);

    await iosUtil.push(
      udid,
      filePath,
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
    const originalFile = this.getRelativePathInAppContainer(
      path.resolve(directory, csrFileName),
    );
    const dir = await tmpDir({unsafeCleanup: true});

    // Workaround for idb weirdness
    // Originally started at D27590885
    // Re-appared at https://github.com/facebook/flipper/issues/3009
    //
    // People reported various workarounds. None of them worked consistently for everyone.
    // Usually, the workarounds included re-building idb from source or re-installing it.
    //
    // The only more or less reasonable explanation I was able to find is that the final behavior depends on whether the idb_companion is local or not.
    //
    // This is how idb_companion sets its locality
    // https://github.com/facebook/idb/blob/main/idb_companion/Server/FBIDBServiceHandler.mm#L1507
    // idb sends a connection request and provides a file path to a temporary file. idb_companion checks if it can access that file.
    //
    // So when it is "local", the pulled filed is written directly to the destination path
    // https://github.com/facebook/idb/blob/main/idb/grpc/client.py#L698
    // So it is expected that the destination path ends with a file to write to.
    // However, if the companion is remote,  then we seem to get here https://github.com/facebook/idb/blob/71791652efa2d5e6f692cb8985ff0d26b69bf08f/idb/common/tar.py#L232
    // Where we create a tree of directories and write the file stream there.
    //
    // So the only explanation I could come up with is that somehow, by re-installing idb and playing with the env, people could affect the locality of the idb_companion.
    //
    // The ultimate workaround is to try pulling the cert file without the cert name attached first, if it fails, try to append it.
    try {
      await iosUtil.pull(
        deviceId,
        originalFile,
        bundleId,
        dir,
        this.idbConfig.idbPath,
      );
    } catch (e) {
      console.warn(
        'Original idb pull failed. Most likely it is a physical device that requires us to handle the dest path dirrently. Forcing a re-try with the updated dest path. See D32106952 for details. Original error:',
        e,
      );
      await iosUtil.pull(
        deviceId,
        originalFile,
        bundleId,
        path.join(dir, csrFileName),
        this.idbConfig.idbPath,
      );
      console.info(
        'Subsequent idb pull succeeded. Nevermind previous wranings.',
      );
    }

    const items = await fs.readdir(dir);
    if (items.length > 1) {
      throw new Error('Conflict in temp dir');
    }
    if (items.length === 0) {
      throw new Error('Failed to pull CSR from device');
    }
    const fileName = items[0];
    const copiedFile = path.resolve(dir, fileName);
    console.debug('Trying to read CSR from', copiedFile);
    const data = await fs.readFile(copiedFile);
    const csrFromDevice = this.santitizeString(data.toString());
    return csrFromDevice === this.santitizeString(csr);
  }
}

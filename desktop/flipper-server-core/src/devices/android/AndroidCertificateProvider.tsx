/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import CertificateProvider from '../../utils/CertificateProvider';
import {Client} from 'adbkit';
import * as androidUtil from './androidContainerUtility';
import {csrFileName, extractAppNameFromCSR} from '../../utils/certificateUtils';

const logTag = 'AndroidCertificateProvider';

export default class AndroidCertificateProvider extends CertificateProvider {
  name = 'AndroidCertificateProvider';
  medium = 'FS_ACCESS' as const;

  constructor(private adb: Client) {
    super();
  }

  async getTargetDeviceId(
    appName: string,
    appDirectory: string,
    csr: string,
  ): Promise<string> {
    console.debug(
      'AndroidCertificateProvider.getTargetDeviceId',
      appName,
      appDirectory,
      csr,
    );
    const devicesInAdb = await this.adb.listDevices();
    if (devicesInAdb.length === 0) {
      throw new Error('No Android devices found');
    }
    const deviceMatchList = devicesInAdb.map(async (device) => {
      try {
        console.debug(
          'AndroidCertificateProvider.getTargetDeviceId -> matching device',
          device.id,
          appName,
          appDirectory,
        );
        const result = await this.androidDeviceHasMatchingCSR(
          appDirectory,
          device.id,
          appName,
          csr,
        );
        return {id: device.id, ...result, error: null};
      } catch (e) {
        console.warn(
          `Unable to check for matching CSR in ${device.id}:${appName}`,
          logTag,
          e,
        );
        return {id: device.id, isMatch: false, foundCsr: null, error: e};
      }
    });
    const devices = await Promise.all(deviceMatchList);
    const matchingIds = devices.filter((m) => m.isMatch).map((m) => m.id);
    if (matchingIds.length == 0) {
      const erroredDevice = devices.find((d) => d.error);
      if (erroredDevice) {
        throw erroredDevice.error;
      }
      const foundCsrs = devices
        .filter((d) => d.foundCsr !== null)
        .map((d) => (d.foundCsr ? encodeURI(d.foundCsr) : 'null'));
      console.warn(`Looking for CSR (url encoded):

            ${encodeURI(this.santitizeString(csr))}

            Found these:

            ${foundCsrs.join('\n\n')}`);
      throw new Error(`No matching device found for app: ${appName}`);
    }
    if (matchingIds.length > 1) {
      console.warn(
        new Error('[conn] More than one matching device found for CSR'),
        csr,
      );
    }
    return matchingIds[0];
  }

  protected async deployOrStageFileForDevice(
    destination: string,
    filename: string,
    contents: string,
    csr: string,
  ) {
    const appName = await extractAppNameFromCSR(csr);
    const deviceId = await this.getTargetDeviceId(appName, destination, csr);
    await androidUtil.push(
      this.adb,
      deviceId,
      appName,
      destination + filename,
      contents,
    );
  }

  private async androidDeviceHasMatchingCSR(
    directory: string,
    deviceId: string,
    processName: string,
    csr: string,
  ): Promise<{isMatch: boolean; foundCsr: string}> {
    const deviceCsr = await androidUtil.pull(
      this.adb,
      deviceId,
      processName,
      directory + csrFileName,
    );
    // Santitize both of the string before comparation
    // The csr string extraction on client side return string in both way
    const [sanitizedDeviceCsr, sanitizedClientCsr] = [
      deviceCsr.toString(),
      csr,
    ].map((s) => this.santitizeString(s));
    console.debug(
      'AndroidCertificateProvider.androidDeviceHasMatchingCSR',
      directory,
      deviceId,
      processName,
      sanitizedDeviceCsr,
      sanitizedClientCsr,
    );
    const isMatch = sanitizedDeviceCsr === sanitizedClientCsr;
    return {isMatch: isMatch, foundCsr: sanitizedDeviceCsr};
  }
}

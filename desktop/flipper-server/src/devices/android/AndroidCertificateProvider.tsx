/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import CertificateProvider from '../../app-connectivity/certificate-exchange/CertificateProvider';
import {Client} from 'adbkit';
import * as androidUtil from './androidContainerUtility';
import {
  csrFileName,
  extractBundleIdFromCSR,
} from '../../app-connectivity/certificate-exchange/certificate-utils';
import {ClientQuery} from 'flipper-common';
import {recorder} from '../../recorder';

export default class AndroidCertificateProvider extends CertificateProvider {
  name = 'AndroidCertificateProvider';
  medium = 'FS_ACCESS' as const;

  constructor(private adb: Client) {
    super();
  }

  async getTargetDeviceId(
    clientQuery: ClientQuery,
    appName: string,
    appDirectory: string,
    csr: string,
  ): Promise<string> {
    recorder.log(clientQuery, 'Query available devices via adb');
    const devices = await this.adb.listDevices();
    if (devices.length === 0) {
      recorder.logError(clientQuery, 'No devices found via adb');
      throw new Error('No Android devices found');
    }

    const deviceMatches = devices.map(async (device) => {
      try {
        const result = await this.androidDeviceHasMatchingCSR(
          appDirectory,
          device.id,
          appName,
          csr,
          clientQuery,
        );
        return {id: device.id, ...result, error: null};
      } catch (e) {
        console.warn(
          `[conn] Unable to check for matching CSR in ${device.id}:${appName}`,
          e,
        );
        return {id: device.id, isMatch: false, foundCsr: null, error: e};
      }
    });
    const matches = await Promise.all(deviceMatches);
    const matchingIds = matches.filter((m) => m.isMatch).map((m) => m.id);

    if (matchingIds.length == 0) {
      recorder.logError(
        clientQuery,
        'Unable to find a matching device for the incoming request',
      );

      const erroredDevice = matches.find((d) => d.error);
      if (erroredDevice) {
        throw erroredDevice.error;
      }
      const foundCsrs = matches
        .filter((d) => d.foundCsr !== null)
        .map((d) => (d.foundCsr ? encodeURI(d.foundCsr) : 'null'));
      console.warn(
        `[conn] Looking for CSR (url encoded):${encodeURI(
          this.santitizeString(csr),
        )} Found these:${foundCsrs.join('\n\n')}`,
      );

      throw new Error(`No matching device found for app: ${appName}`);
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

    const appName = await extractBundleIdFromCSR(csr);
    const deviceId = await this.getTargetDeviceId(
      clientQuery,
      appName,
      destination,
      csr,
    );
    await androidUtil.push(
      this.adb,
      deviceId,
      appName,
      destination + filename,
      contents,
      clientQuery,
    );
  }

  private async androidDeviceHasMatchingCSR(
    directory: string,
    deviceId: string,
    processName: string,
    csr: string,
    clientQuery: ClientQuery,
  ): Promise<{isMatch: boolean; foundCsr: string}> {
    const deviceCsr = await androidUtil.pull(
      this.adb,
      deviceId,
      processName,
      directory + csrFileName,
      clientQuery,
    );
    // Santitize both of the string before comparation
    // The csr string extraction on client side return string in both way
    const [sanitizedDeviceCsr, sanitizedClientCsr] = [
      deviceCsr.toString(),
      csr,
    ].map((s) => this.santitizeString(s));

    const isMatch = sanitizedDeviceCsr === sanitizedClientCsr;
    return {isMatch, foundCsr: sanitizedDeviceCsr};
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  deviceCAcertFile,
  deviceClientCertFile,
  ensureOpenSSLIsAvailable,
  extractAppNameFromCSR,
  generateClientCertificate,
  getCACertificate,
} from './certificateUtils';

export type CertificateExchangeMedium = 'FS_ACCESS' | 'WWW' | 'NONE';

export default abstract class CertificateProvider {
  abstract medium: CertificateExchangeMedium;
  abstract name: string;

  verifyMedium(medium: CertificateExchangeMedium) {
    if (this.medium !== medium) {
      throw new Error(`${this.name} does not support medium ${medium}`);
    }
  }

  async processCertificateSigningRequest(
    unsanitizedCsr: string,
    os: string,
    appDirectory: string,
  ): Promise<{deviceId: string}> {
    console.debug(
      `${this.constructor.name}.processCertificateSigningRequest`,
      unsanitizedCsr,
      os,
      appDirectory,
    );
    const csr = this.santitizeString(unsanitizedCsr);
    if (csr === '') {
      return Promise.reject(new Error(`Received empty CSR from ${os} device`));
    }
    console.debug(
      `${this.constructor.name}.processCertificateSigningRequest -> ensureOpenSSLIsAvailable`,
      os,
      appDirectory,
    );
    await ensureOpenSSLIsAvailable();
    const caCert = await getCACertificate();
    console.debug(
      `${this.constructor.name}.processCertificateSigningRequest -> deploy caCert`,
      os,
      appDirectory,
    );
    await this.deployOrStageFileForDevice(
      appDirectory,
      deviceCAcertFile,
      caCert,
      csr,
    );
    console.debug(
      `${this.constructor.name}.processCertificateSigningRequest -> generateClientCertificate`,
      os,
      appDirectory,
    );
    const clientCert = await generateClientCertificate(csr);
    console.debug(
      `${this.constructor.name}.processCertificateSigningRequest -> deploy clientCert`,
      os,
      appDirectory,
    );
    await this.deployOrStageFileForDevice(
      appDirectory,
      deviceClientCertFile,
      clientCert,
      csr,
    );
    const appName = await extractAppNameFromCSR(csr);
    console.debug(
      `${this.constructor.name}.processCertificateSigningRequest -> getTargetDeviceId`,
      os,
      appDirectory,
      appName,
    );
    const deviceId = await this.getTargetDeviceId(appName, appDirectory, csr);
    console.debug(
      `${this.constructor.name}.processCertificateSigningRequest -> done`,
      os,
      appDirectory,
      appName,
      deviceId,
    );
    return {
      deviceId,
    };
  }

  abstract getTargetDeviceId(
    _appName: string,
    _appDirectory: string,
    _csr: string,
  ): Promise<string>;

  protected abstract deployOrStageFileForDevice(
    destination: string,
    filename: string,
    contents: string,
    csr: string,
  ): Promise<void>;

  protected santitizeString(csrString: string): string {
    return csrString.replace(/\r/g, '').trim();
  }
}

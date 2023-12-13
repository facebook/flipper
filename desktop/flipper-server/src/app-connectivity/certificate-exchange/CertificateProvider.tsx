/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CertificateExchangeMedium, ClientQuery} from 'flipper-common';
import {recorder} from '../../recorder';
import {
  deviceCAcertFile,
  deviceClientCertFile,
  ensureOpenSSLIsAvailable,
  extractBundleIdFromCSR,
  generateClientCertificate,
  getCACertificate,
} from './certificate-utils';

export default abstract class CertificateProvider {
  abstract medium: CertificateExchangeMedium;
  abstract name: string;

  verifyMedium(medium: CertificateExchangeMedium) {
    if (this.medium !== medium) {
      throw new Error(`${this.name} does not support medium ${medium}`);
    }
  }

  async processCertificateSigningRequest(
    clientQuery: ClientQuery,
    unsanitizedCsr: string,
    appDirectory: string,
  ): Promise<{deviceId: string}> {
    const csr = this.santitizeString(unsanitizedCsr);
    if (csr === '') {
      const msg = `Received empty CSR from ${clientQuery.os} device`;
      recorder.logError(clientQuery, msg);
      return Promise.reject(new Error(msg));
    }

    recorder.log(clientQuery, 'Ensure OpenSSL is available');
    await ensureOpenSSLIsAvailable();

    recorder.log(clientQuery, 'Obtain CA certificate');
    const caCert = await getCACertificate();

    recorder.log(clientQuery, 'Deploy CA certificate to application sandbox');
    await this.deployOrStageFileForDevice(
      clientQuery,
      appDirectory,
      deviceCAcertFile,
      caCert,
      csr,
    );

    recorder.log(clientQuery, 'Generate client certificate');
    const clientCert = await generateClientCertificate(csr);

    recorder.log(
      clientQuery,
      'Deploy client certificate to application sandbox',
    );
    await this.deployOrStageFileForDevice(
      clientQuery,
      appDirectory,
      deviceClientCertFile,
      clientCert,
      csr,
    );

    recorder.log(clientQuery, 'Extract application name from CSR');
    const bundleId = await extractBundleIdFromCSR(csr);

    recorder.log(
      clientQuery,
      'Get target device from CSR and application name',
    );
    const deviceId = await this.getTargetDeviceId(
      clientQuery,
      bundleId,
      appDirectory,
      csr,
    );

    recorder.log(
      clientQuery,
      `Finished processing CSR, device identifier is '${deviceId}'`,
    );
    return {
      deviceId,
    };
  }

  abstract getTargetDeviceId(
    clientQuery: ClientQuery,
    bundleId: string,
    appDirectory: string,
    csr: string,
  ): Promise<string>;

  protected abstract deployOrStageFileForDevice(
    clientQuery: ClientQuery,
    destination: string,
    filename: string,
    contents: string,
    csr: string,
  ): Promise<void>;

  protected santitizeString(csrString: string): string {
    return csrString.replace(/\r/g, '').trim();
  }
}

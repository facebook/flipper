/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CertificateExchangeMedium, ClientQuery} from 'flipper-common';
import {promisify} from 'util';
import {recorder} from '../../recorder';
import {
  deviceCAcertFile,
  deviceClientCertFile,
  ensureOpenSSLIsAvailable,
  ephemeralEncryption,
  extractBundleIdFromCSR,
  generateClientCertificate,
  getCACertificate,
} from './certificate-utils';
import path from 'path';
import tmp from 'tmp';
import fs from 'fs-extra';
import archiver from 'archiver';

/**
 * Some exchange operations can throw: get device identifier, push/pull certificates to the app's sandbox.
 * Previously, if there was an error, this was caught by the caller and an empty response was sent back to the app.
 *
 * After this change, those same operations can fail, but the exception will be caught and set into the response type.
 * It is reponsability of the caller to check if there is an error and handle accordingly.
 *
 * Why?
 * Because, even if those operations fail, an overal failure may be avoided by instead, for example, attempt a different type of exchange.
 * In those cases, the certificate bundles are still of value to the caller.
 *
 * The properties certificates and certificatesZip will always be set unless a proper error takes place which will prevent any type of exchange.
 * Device identifier and no error will be found when the certificate provider succeeded.
 * The absence of device identifier and/or presence of error indicate the certificate provider failed to
 * exchange certificates.
 */
export type CertificateExchangeRequestResult =
  | {
      deviceId: string;
      error?: never;
      certificatesZip?: string;
      certificates?: {
        key: string;
        data: string;
      };
    }
  | {
      deviceId?: never;
      error: Error;
      certificatesZip?: string;
      certificates?: {
        key: string;
        data: string;
      };
    };

export default abstract class CertificateProvider {
  abstract medium: CertificateExchangeMedium;
  abstract name: string;
  verifyMedium(medium: CertificateExchangeMedium) {
    if (this.medium !== medium) {
      throw new Error(`${this.name} does not support medium ${medium}`);
    }
  }

  private async stageFile(
    destination: string,
    filename: string,
    contents: string,
  ) {
    const exists = await fs.pathExists(destination);
    if (!exists) {
      await fs.mkdir(destination);
    }
    try {
      await fs.writeFile(path.join(destination, filename), contents);
      return;
    } catch (e) {
      throw new Error(
        `Failed to write ${filename} to specified destination. Error: ${e}`,
      );
    }
  }

  async processCertificateSigningRequest(
    clientQuery: ClientQuery,
    unsanitizedCSR: string,
    sandboxDirectory: string,
  ): Promise<CertificateExchangeRequestResult> {
    const temporaryDirectory = await promisify(tmp.dir)();
    const certificatesDirectory = path.join(
      temporaryDirectory,
      `flipper-certificates`,
    );
    const certificatesZipDirectory = path.join(
      temporaryDirectory,
      'flipper-certificates.zip',
    );

    const csr = this.santitizeString(unsanitizedCSR);
    if (csr === '') {
      const msg = `Received empty CSR from ${clientQuery.os} device`;
      recorder.logError(clientQuery, msg);
      return Promise.reject(new Error(msg));
    }

    recorder.log(clientQuery, 'Ensure OpenSSL is available');
    await ensureOpenSSLIsAvailable();

    recorder.log(clientQuery, 'Extract bundle identifier from CSR');
    const bundleId = await extractBundleIdFromCSR(csr);

    recorder.log(clientQuery, 'Obtain CA certificate');
    const caCertificate = await getCACertificate();
    this.stageFile(certificatesDirectory, deviceCAcertFile, caCertificate);

    recorder.log(clientQuery, 'Generate client certificate');
    const clientCertificate = await generateClientCertificate(csr);
    this.stageFile(
      certificatesDirectory,
      deviceClientCertFile,
      clientCertificate,
    );

    const compressCertificatesBundle = new Promise((resolve, reject) => {
      const output = fs.createWriteStream(certificatesZipDirectory);
      const archive = archiver('zip', {
        zlib: {level: 9}, // Sets the compression level.
      });
      archive.directory(certificatesDirectory, false);
      output.on('close', function () {
        resolve(certificatesZipDirectory);
      });
      archive.on('warning', reject);
      archive.on('error', reject);
      archive.pipe(output);
      archive.finalize();
    });

    await compressCertificatesBundle;

    const encryptedCertificates = await ephemeralEncryption(
      certificatesZipDirectory,
    );

    try {
      recorder.log(
        clientQuery,
        'Get target device from CSR and bundle identifier',
      );
      const deviceId = await this.getTargetDeviceId(
        clientQuery,
        bundleId,
        sandboxDirectory,
        csr,
      );

      recorder.log(clientQuery, 'Deploy CA certificate to application sandbox');
      await this.deployOrStageFileForDevice(
        clientQuery,
        sandboxDirectory,
        deviceCAcertFile,
        caCertificate,
        csr,
      );

      recorder.log(
        clientQuery,
        'Deploy client certificate to application sandbox',
      );
      await this.deployOrStageFileForDevice(
        clientQuery,
        sandboxDirectory,
        deviceClientCertFile,
        clientCertificate,
        csr,
      );

      recorder.log(
        clientQuery,
        `Finished processing CSR, device identifier is '${deviceId}'`,
      );

      return {
        deviceId,
        certificates: encryptedCertificates,
        certificatesZip: certificatesZipDirectory,
      };
    } catch (error) {
      return {
        error,
        certificates: encryptedCertificates,
        certificatesZip: certificatesZipDirectory,
      };
    }
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

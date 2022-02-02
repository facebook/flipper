/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {promisify} from 'util';
import fs from 'fs-extra';
import tmp from 'tmp';
import {reportPlatformFailures} from 'flipper-common';
import archiver from 'archiver';
import {timeout} from 'flipper-common';
import {v4 as uuid} from 'uuid';
import {internGraphPOSTAPIRequest} from '../fb-stubs/internRequests';
import {
  deviceCAcertFile,
  deviceClientCertFile,
  ensureOpenSSLIsAvailable,
  extractAppNameFromCSR,
  generateClientCertificate,
  getCACertificate,
} from './certificateUtils';
import {KeytarManager, SERVICE_FLIPPER} from './keytar';

export type CertificateExchangeMedium = 'FS_ACCESS' | 'WWW' | 'NONE';

export default abstract class CertificateProvider {
  constructor(private readonly keytarManager: KeytarManager) {}

  private uploadFiles = async (
    zipPath: string,
    deviceID: string,
  ): Promise<void> => {
    return reportPlatformFailures(
      timeout(
        5 * 60 * 1000,
        internGraphPOSTAPIRequest(
          'flipper/certificates',
          {
            device_id: deviceID,
          },
          {
            certificate_zip: {
              path: zipPath,
              filename: 'certs.zip',
            },
          },
          {timeout: 5 * 60 * 1000},
          await this.keytarManager.retrieveToken(SERVICE_FLIPPER),
        ).then(() => {}),
        'Timed out uploading Flipper certificates to WWW.',
      ),
      'uploadCertificates',
    );
  };

  async processCertificateSigningRequest(
    unsanitizedCsr: string,
    os: string,
    appDirectory: string,
    medium: CertificateExchangeMedium,
  ): Promise<{deviceId: string}> {
    const csr = this.santitizeString(unsanitizedCsr);
    if (csr === '') {
      return Promise.reject(new Error(`Received empty CSR from ${os} device`));
    }
    await ensureOpenSSLIsAvailable();
    const rootFolder = await promisify(tmp.dir)();
    const certFolder = rootFolder + '/FlipperCerts/';
    const certsZipPath = rootFolder + '/certs.zip';
    const caCert = await getCACertificate();
    await this.deployOrStageFileForDevice(
      appDirectory,
      deviceCAcertFile,
      caCert,
      csr,
      medium,
      certFolder,
    );
    const clientCert = await generateClientCertificate(csr);
    await this.deployOrStageFileForDevice(
      appDirectory,
      deviceClientCertFile,
      clientCert,
      csr,
      medium,
      certFolder,
    );
    const appName = await extractAppNameFromCSR(csr);
    const deviceId =
      medium === 'FS_ACCESS'
        ? await this.getTargetDeviceId(appName, appDirectory, csr)
        : uuid();
    if (medium === 'WWW') {
      const zipPromise = new Promise((resolve, reject) => {
        const output = fs.createWriteStream(certsZipPath);
        const archive = archiver('zip', {
          zlib: {level: 9}, // Sets the compression level.
        });
        archive.directory(certFolder, false);
        output.on('close', function () {
          resolve(certsZipPath);
        });
        archive.on('warning', reject);
        archive.on('error', reject);
        archive.pipe(output);
        archive.finalize();
      });

      await reportPlatformFailures(
        zipPromise,
        'www-certs-exchange-zipping-certs',
      );
      await reportPlatformFailures(
        this.uploadFiles(certsZipPath, deviceId),
        'www-certs-exchange-uploading-certs',
      );
    }
    return {
      deviceId,
    };
  }

  abstract getTargetDeviceId(
    _appName: string,
    _appDirectory: string,
    _csr: string,
  ): Promise<string>;

  private async deployOrStageFileForDevice(
    destination: string,
    filename: string,
    contents: string,
    csr: string,
    medium: CertificateExchangeMedium,
    certFolder: string,
  ): Promise<void> {
    if (medium === 'WWW') {
      const certPathExists = await fs.pathExists(certFolder);
      if (!certPathExists) {
        await fs.mkdir(certFolder);
      }
      try {
        await fs.writeFile(certFolder + filename, contents);
        return;
      } catch (e) {
        throw new Error(
          `Failed to write ${filename} to temporary folder. Error: ${e}`,
        );
      }
    }

    const appName = await extractAppNameFromCSR(csr);
    this.handleFSBasedDeploy(destination, filename, contents, csr, appName);
  }

  protected abstract handleFSBasedDeploy(
    _destination: string,
    _filename: string,
    _contents: string,
    _csr: string,
    _appName: string,
  ): Promise<void>;

  protected santitizeString(csrString: string): string {
    return csrString.replace(/\r/g, '').trim();
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {KeytarManager} from '../utils/keytar';
import CertificateProvider from '../app-connectivity/certificate-exchange/CertificateProvider';

export default class WWWCertificateProvider extends CertificateProvider {
  name = 'WWWCertificateProvider';
  medium = 'WWW' as const;

  constructor(private keytarManager: KeytarManager) {
    super();
  }

  async processCertificateSigningRequest(): Promise<{deviceId: string}> {
    throw new Error('WWWCertificateProvider is not implemented');
  }

  async getTargetDeviceId(): Promise<string> {
    throw new Error('WWWCertificateProvider is not implemented');
  }

  protected async deployOrStageFileForDevice(): Promise<void> {
    throw new Error('WWWCertificateProvider is not implemented');
  }
}

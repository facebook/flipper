/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import CertificateProvider from '../../app-connectivity/certificate-exchange/CertificateProvider';
import fs from 'fs-extra';

export default class DesktopCertificateProvider extends CertificateProvider {
  name = 'DesktopCertificateProvider';
  medium = 'FS_ACCESS' as const;
  async getTargetDeviceId(): Promise<string> {
    // TODO: Could we use some real device serial? Currently, '' corresponds to a local device.
    // Whats if some app connects from a remote device?
    // What if two apps connect from several different remote devices?
    return '';
  }

  protected async deployOrStageFileForDevice(
    destination: string,
    filename: string,
    contents: string,
  ) {
    await fs.writeFile(destination + filename, contents);
  }
}

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
import {ClientQuery} from 'flipper-common';

export default class DesktopCertificateProvider extends CertificateProvider {
  name = 'DesktopCertificateProvider';
  medium = 'FS_ACCESS' as const;

  /**
   * For Desktop devices, we currently return an empty string as the device
   * identifier. TODO: Is there an actual device serial we could use instead?
   * - What if some app connects from a remote device?
   * - What if two apps connect from several different remote devices?
   * @returns An empty string.
   */
  async getTargetDeviceId(): Promise<string> {
    return '';
  }

  protected async deployOrStageFileForDevice(
    _: ClientQuery,
    destination: string,
    filename: string,
    contents: string,
  ) {
    await fs.writeFile(destination + filename, contents);
  }
}

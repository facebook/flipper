/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ClientQuery} from 'flipper-plugin';
import {CertificateExchangeMedium} from '../utils/CertificateProvider';

/**
 * Transforms the certificate exchange medium type as number to the
 * CertificateExchangeMedium type.
 * @param medium A number representing the certificate exchange medium type.
 */
export function transformCertificateExchangeMediumToType(
  medium: number | undefined,
): CertificateExchangeMedium {
  switch (medium) {
    case undefined:
    case 1:
      return 'FS_ACCESS';
    case 2:
      return 'WWW';
    case 3:
      return 'NONE';
    default:
      throw new Error('Unknown Certificate exchange medium: ' + medium);
  }
}

/**
 * Returns the app name from a ClientQuery instance. In most cases it should be
 * the app name as given in the query. On Android, and for old SDK versions (<3) it
 * will returned the app name suffixed by '(Outdated SDK)'.
 *
 * Reason is, in previous version (<3), app may not appear in correct device
 * section because it refers to the name given by client which is not fixed
 * for android emulators, so it is indicated as outdated so that developers
 * might want to update SDK to get rid of this connection swap problem
 * @param query A ClientQuery object.
 */
export function appNameWithUpdateHint(query: ClientQuery): string {
  if (query.os === 'Android' && (!query.sdk_version || query.sdk_version < 3)) {
    return query.app + ' (Outdated SDK)';
  }
  return query.app;
}

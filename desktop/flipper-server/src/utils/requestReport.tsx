/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  CancelledPromiseError,
  UnsupportedError,
  logPlatformSuccessRate,
} from 'flipper-common';
import {AxiosResponse} from 'axios';

export default async function report<T>(
  key: string,
  promise: Promise<AxiosResponse<T>>,
): Promise<AxiosResponse<T>> {
  return new Promise<AxiosResponse<T>>((resolve, reject) => {
    promise
      .then((res) => {
        if (res.status === 200) {
          logPlatformSuccessRate(key, {kind: 'success'});
        } else {
          logPlatformSuccessRate(key, {
            kind: 'failure',
            supportedOperation: true,
            error: `${res.status} (${res.statusText})`,
          });
        }
        resolve(res);
      })
      .catch((err) => {
        if (err instanceof CancelledPromiseError) {
          logPlatformSuccessRate(key, {
            kind: 'cancelled',
          });
        } else {
          logPlatformSuccessRate(key, {
            kind: 'failure',
            supportedOperation: !(err instanceof UnsupportedError),
            error: err,
          });
        }
        reject(err);
      });
  });
}

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

declare module 'openssl-wrapper' {
  export type Action =
    | 'cms.verify'
    | 'genrsa'
    | 'pkcs12'
    | 'req'
    | 'req.new'
    | 'req.verify'
    | 'verify'
    | 'rsa'
    | 'smime.verify'
    | 'x509.req'
    | 'x509';

  export function exec(
    action: Action,
    options: {[key: string]: string},
    cb: (error: Error | undefined, buffer: Buffer | undefined) => any,
  ): void;
}

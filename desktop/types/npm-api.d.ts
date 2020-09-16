/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// Very incomplete stub with only the methods we use defined.
declare module 'npm-api' {
  export default class NpmApi {
    constructor(...args: any[]);

    list(...args: any[]): any;

    maintainer(...args: any[]): any;

    repo(name: string): Repository;

    reset(...args: any[]): any;

    use(...args: any[]): any;

    view(...args: any[]): any;
  }

  export class Repository {
    package(): Promise<Package>;
  }

  export interface Package {
    name: string;
    version: string;
    [name: string]: string;
  }
}

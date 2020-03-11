/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

declare module 'JSONStream' {
  export interface Options {
    recurse: boolean;
  }

  export function parse(pattern: any): NodeJS.ReadWriteStream;
  export function parse(patterns: any[]): NodeJS.ReadWriteStream;

  /**
   * Create a writable stream.
   * you may pass in custom open, close, and seperator strings. But, by default,
   * JSONStream.stringify() will create an array,
   * (with default options open='[\n', sep='\n,\n', close='\n]\n')
   */
  export function stringify(): NodeJS.ReadWriteStream;

  /** If you call JSONStream.stringify(false) the elements will only be seperated by a newline. */
  export function stringify(
    newlineOnly: NewlineOnlyIndicator,
  ): NodeJS.ReadWriteStream;
  type NewlineOnlyIndicator = false;

  /**
   * Create a writable stream.
   * you may pass in custom open, close, and seperator strings. But, by default,
   * JSONStream.stringify() will create an array,
   * (with default options open='[\n', sep='\n,\n', close='\n]\n')
   */
  export function stringify(
    open: string,
    sep: string,
    close: string,
  ): NodeJS.ReadWriteStream;
  export function stringifyObject(): NodeJS.ReadWriteStream;
  export function stringifyObject(
    open: string,
    sep: string,
    close: string,
  ): NodeJS.ReadWriteStream;
}

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export enum QuickLogActionType {
  START = 1,
  SUCCESS = 2,
  FAIL = 3,
  CANCEL = 4,
  CANCEL_UNLOAD = 706,
  INTERRUPTED = 96,
}

export enum FLIPPER_QPL_EVENTS {
  STARTUP = 52035585,
}

interface Annotations {
  string: {[key: string]: string} | null | undefined;
  int: {[key: string]: number} | null | undefined;
  double: {[key: string]: number} | null | undefined;
  bool: {[key: string]: boolean} | null | undefined;
  string_array: {[key: string]: string[]} | null | undefined;
  int_array: {[key: string]: number[]} | null | undefined;
  double_array: {[key: string]: number[]} | null | undefined;
  bool_array: {[key: string]: boolean[]} | null | undefined;
}

class QuickPerformanceLogger {
  markerStart(
    _markerId: number,
    _instanceKey?: number,
    _timestamp?: DOMHighResTimeStamp,
  ): void {}

  markerPoint(
    _markerId: number,
    _name: string,
    _options?: {
      instanceKey?: number;
      data?: Annotations | null | undefined;
      timestamp?: DOMHighResTimeStamp;
    },
  ): void {}

  markerEnd(
    _markerId: number,
    _action: QuickLogActionType,
    _instanceKey?: number,
    _timestamp?: DOMHighResTimeStamp,
  ): void {}
}

export default new QuickPerformanceLogger();

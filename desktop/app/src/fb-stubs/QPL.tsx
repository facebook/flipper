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

// currently added manually from https://www.internalfb.com/intern/quicklog/?tab=events&moduleName=fl&modules[0]=FLIPPER
export enum FLIPPER_QPL_EVENTS {
  STARTUP = 52035585,
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
    _data?: string,
    _instanceKey?: number,
    _timestamp?: DOMHighResTimeStamp,
  ): void {}

  markerEnd(
    _markerId: number,
    _action: QuickLogActionType,
    _instanceKey?: number,
    _timestamp?: DOMHighResTimeStamp,
  ): void {}
}

export default new QuickPerformanceLogger();

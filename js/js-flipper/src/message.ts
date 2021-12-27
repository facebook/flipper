/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export interface FlipperRequest {
  method: string;
  params?: {
    method: string;
    api: string;
    params?: unknown;
  };
}
export type FlipperResponse =
  | {
      id: number;
      success: object | string | number | boolean | null;
      error?: never;
    }
  | {
      id: number;
      success?: never;
      error: FlipperErrorMessage;
    };
export interface FlipperErrorMessage {
  message: string;
  stacktrace?: string;
  name?: string;
}
export interface FlipperMessageBus {
  sendData(data: FlipperRequest | FlipperResponse): void;
}

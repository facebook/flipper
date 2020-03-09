/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type Filter =
  | {
      key: string;
      value: string;
      type: 'include' | 'exclude';
    }
  | {
      key: string;
      value: Array<string>;
      type: 'enum';
      enum: Array<{
        label: string;
        color?: string;
        value: string;
      }>;
      persistent?: boolean;
    };

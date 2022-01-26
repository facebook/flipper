/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type IdbConfig = {
  idbPath: string;
  enablePhysicalIOS: boolean;
};

let idbConfig: IdbConfig | undefined;

export const getIdbConfig = () => idbConfig;

export const setIdbConfig = (newIdbConfig: IdbConfig) => {
  idbConfig = newIdbConfig;
  return idbConfig;
};

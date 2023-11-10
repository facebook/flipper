/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export const getIdbInstallationInstructions = (idbPath: string) =>
  `IDB is required to use Flipper with iOS devices. It can be installed from https://github.com/facebook/idb and configured in Flipper settings. You can also disable physical iOS device support in settings. Current setting: ${idbPath} isn't a valid IDB installation.`;

export const installXcode =
  'Install Xcode from the App Store or download it from https://developer.apple.com';

export const installSDK =
  'You can install it using Xcode (https://developer.apple.com/xcode/).';

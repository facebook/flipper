/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {NoDevices} from '../NoDevices';

export function TroubleshootingGuide(_props: {
  showGuide: boolean;
  devicesDetected: number;
}) {
  if (_props.devicesDetected == 0) return <NoDevices />;
  else {
    return <></>;
  }
}

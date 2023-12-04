/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperDoctor} from 'flipper-common';
import {PropsFor} from '../util';
import React from 'react';
import {Typography} from 'antd';

const AndroidStudioNotInstalled = (
  _props: PropsFor<'android.android-studio--not_installed'>,
) => (
  <Typography.Paragraph>
    Android Studio is not installed. Install Android Studio from
    <a href="https://developer.android.com/studio" target="_blank">
      developer.android.com/studio
    </a>
  </Typography.Paragraph>
);
const IosXcodeNodeInstalled = (
  _props: PropsFor<'ios.xcode--not_installed'>,
) => (
  <Typography.Paragraph>
    Install Xcode from the App Store or download it from{' '}
    <a href="https://developer.apple.com" target="_blank">
      developer.apple.com
    </a>
  </Typography.Paragraph>
);
export const moreMessageToComp: {
  [K in keyof FlipperDoctor.HealthcheckResultMessageMapping]?: React.FC<
    PropsFor<K>
  >;
} = {
  'ios.xcode--not_installed': IosXcodeNodeInstalled,
  'android.android-studio--not_installed': AndroidStudioNotInstalled,
};

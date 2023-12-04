/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperDoctor} from 'flipper-common';
import {theme} from 'flipper-plugin';
import React from 'react';
import {Typography} from 'antd';

function CodeBlock({children}: {children: string}) {
  return (
    <pre
      style={{
        whiteSpace: 'pre-wrap',
        padding: '2px 4px',
        background: theme.backgroundWash,
      }}>
      {children}
    </pre>
  );
}
function Noop() {
  return <span>Unimplemented</span>;
}
const CommonOpenSSLInstalled = (
  props: PropsFor<'common.openssl--installed'>,
) => (
  <div>
    <Typography.Paragraph>
      <a href="https://wiki.openssl.org/index.php/Binaries" target="_blank">
        OpenSSL
      </a>{' '}
      is installed and added to PATH.
    </Typography.Paragraph>
    <CodeBlock>{props.output}</CodeBlock>
  </div>
);

const CommonOpenSSLNotInstalled = (
  props: PropsFor<'common.openssl--not_installed'>,
) => (
  <div>
    <Typography.Paragraph>
      <a href="https://wiki.openssl.org/index.php/Binaries" target="_blank">
        OpenSSL
      </a>{' '}
      is not installed or not added to PATH.
    </Typography.Paragraph>
    <CodeBlock>{props.output}</CodeBlock>
  </div>
);

const CommonWatchmanInstalled = (
  _props: PropsFor<'common.watchman--installed'>,
) => (
  <Typography.Paragraph>
    <a href="https://facebook.github.io/watchman/" target="_blank">
      Watchman
    </a>{' '}
    file watching service is installed and added to PATH. Live reloading after
    changes during Flipper plugin development is enabled.
  </Typography.Paragraph>
);

const CommonWatchmanNotInstalled = (
  _props: PropsFor<'common.watchman--not_installed'>,
) => (
  <Typography.Paragraph>
    <a href="https://facebook.github.io/watchman/" target="_blank">
      Watchman
    </a>{' '}
    file watching service is not installed or not added to PATH. Live reloading
    after changes during Flipper plugin development is disabled.
  </Typography.Paragraph>
);

const AndroidStudioInstalled = (
  _props: PropsFor<'android.android-studio--installed'>,
) => <Typography.Paragraph>Android Studio is installed.</Typography.Paragraph>;

const AndroidSdkNoAndroidHome = (
  _props: PropsFor<'android.sdk--no_ANDROID_HOME'>,
) => (
  // TODO: open settings buttons
  <Typography.Paragraph>
    ANDROID_HOME is not defined. You can use Flipper Settings (More {'>'}{' '}
    Settings) to point to its location.
  </Typography.Paragraph>
);

const AndroidSdkInvalidAndroidHome = (
  props: PropsFor<'android.sdk--invalid_ANDROID_HOME'>,
) => (
  // TODO: open settings buttons
  <Typography.Paragraph>
    ANDROID_HOME point to a folder which does not exist: {props.androidHome}.
    You can use Flipper Settings (More {'>'} Settings) to point to a different
    location.
  </Typography.Paragraph>
);

const AndroidSdkNoAndroidSdk = (
  props: PropsFor<'android.sdk--no_android_sdk'>,
) => (
  <Typography.Paragraph>
    Android SDK Platform Tools not found at the expected location "
    {props.platformToolsDir}". Probably they are not installed.
  </Typography.Paragraph>
);

const AndroidSdkNoAndroidSdkRoot = (
  _props: PropsFor<'android.sdk--no_ANDROID_SDK_ROOT'>,
) => (
  <Typography.Paragraph>
    ANDROID_SDK_ROOT is not set. You can use Flipper Settings (More {'>'}
    Settings) to point to its location.
  </Typography.Paragraph>
);

const AndroidSdkInstalled = (props: PropsFor<'android.sdk--installed'>) => (
  <div>
    <Typography.Paragraph>
      Android SDK Platform Tools found at the expected location.
    </Typography.Paragraph>
    <CodeBlock>{props.output}</CodeBlock>
  </div>
);

type PropsFor<T extends keyof FlipperDoctor.HealthcheckResultMessageMapping> =
  FlipperDoctor.HealthcheckResultMessageMapping[T] extends []
    ? {}
    : FlipperDoctor.HealthcheckResultMessageMapping[T][0];
const messageToComp: {
  [K in keyof FlipperDoctor.HealthcheckResultMessageMapping]: React.FC<
    PropsFor<K>
  >;
} = {
  'common.openssl--installed': CommonOpenSSLInstalled,
  'common.openssl--not_installed': CommonOpenSSLNotInstalled,

  'common.watchman--installed': CommonWatchmanInstalled,
  'common.watchman--not_installed': CommonWatchmanNotInstalled,

  'android.android-studio--installed': AndroidStudioInstalled,
  // TODO oss and internal
  'android.android-studio--not_installed': Noop,

  'android.sdk--no_ANDROID_HOME': AndroidSdkNoAndroidHome,
  'android.sdk--invalid_ANDROID_HOME': AndroidSdkInvalidAndroidHome,
  'android.sdk--no_android_sdk': AndroidSdkNoAndroidSdk,

  'android.sdk--no_ANDROID_SDK_ROOT': AndroidSdkNoAndroidSdkRoot,
  'android.sdk--unexisting_folder_ANDROID_SDK_ROOT': AndroidSdkNoAndroidSdkRoot,
  'android.sdk--installed': AndroidSdkInstalled,

  'ios.xcode--installed': Noop,
  'ios.xcode--not_installed': Noop,

  'ios.xcode-select--set': Noop,
  'ios.xcode-select--not_set': Noop,
  'ios.xcode-select--no_xcode_selected': Noop,
  'ios.xcode-select--noop': Noop,
  'ios.xcode-select--custom_path': Noop,
  'ios.xcode-select--old_version_selected': Noop,
  'ios.xcode-select--nonexisting_selected': Noop,

  'ios.sdk--installed': Noop,
  'ios.sdk--not_installed': Noop,

  'ios.xctrace--installed': Noop,
  'ios.xctrace--not_installed': Noop,

  'ios.idb--no_context': Noop,
  'ios.idb--physical_device_disabled': Noop,
  'ios.idb--not_installed': Noop,
  'ios.idb--installed': Noop,

  'command-success': Noop,
  'command-fail': Noop,

  'doctor-failed': Noop,
};

export const DoctorMessage = <
  T extends keyof FlipperDoctor.HealthcheckResultMessageMapping,
>({
  id,
  props,
}: {
  id: T;
  props: any;
}) => {
  if (id in messageToComp) {
    const Comp = messageToComp[id];
    return <Comp {...props} />;
  }

  throw new Error(`Doctor: unexpected key "${id}"`);
};

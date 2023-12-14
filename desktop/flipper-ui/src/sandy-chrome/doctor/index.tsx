/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperDoctor} from 'flipper-common';
import React from 'react';
import {Typography} from 'antd';
import {
  CodeBlock,
  PropsFor,
  Noop,
  CliCommand,
  List,
  OpenFlippeSettingBtn,
} from './util';
import {moreMessageToComp} from './fb-stubs/messages';

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
  <Typography.Paragraph>
    Android SDK Location is not defined. You can use <OpenFlippeSettingBtn /> to
    point to its location.
  </Typography.Paragraph>
);

const AndroidSdkInvalidAndroidHome = (
  props: PropsFor<'android.sdk--invalid_ANDROID_HOME'>,
) => (
  <Typography.Paragraph>
    Android SDK Location points to a folder which does not exist:
    <br />
    <code>{props.androidHome}</code>
    <br />
    {props.existingAndroidHome != null ? (
      <>
        You have another location that can be used{' '}
        <CliCommand title="" command={props.existingAndroidHome} /> you can set
        it up in <OpenFlippeSettingBtn />.
      </>
    ) : (
      <>
        You can change it in <OpenFlippeSettingBtn />.
      </>
    )}
  </Typography.Paragraph>
);

const AndroidSdkNoAndroidSdk = (
  props: PropsFor<'android.sdk--no_android_sdk'>,
) => (
  <Typography.Paragraph>
    Android SDK Platform Tools not found at the expected location "
    {props.platformToolsDir}". Probably they are not installed. See{' '}
    <a
      href="https://fbflipper.com/docs/getting-started/troubleshooting/install-android-sdk/"
      target="_blank">
      Android SDK Install Instruction
    </a>
  </Typography.Paragraph>
);

const AndroidSdkNoAndroidSdkRoot = (
  _props: PropsFor<'android.sdk--no_ANDROID_SDK_ROOT'>,
) => (
  <Typography.Paragraph>
    ANDROID_SDK_ROOT is not set. Use <OpenFlippeSettingBtn /> to point to its
    location.
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

const AndroidSdkNotInstalled = (
  props: PropsFor<'android.sdk--not_installed'>,
) => (
  <div>
    <Typography.Paragraph>
      Android SDK Platform Tools are not found at the expected location.
    </Typography.Paragraph>
    <CodeBlock>{props.output}</CodeBlock>
  </div>
);

const IosXcodeInstalled = (props: PropsFor<'ios.xcode--installed'>) => (
  <Typography.Paragraph>
    Xcode is installed. Version {props.version} at "{props.path}"
  </Typography.Paragraph>
);

const XcodeSelectSet = (props: PropsFor<'ios.xcode-select--set'>) => (
  <Typography.Paragraph>
    xcode-select path:
    <CodeBlock>{props.selected}</CodeBlock>
  </Typography.Paragraph>
);
const XcodeSelectNotSet = (_props: PropsFor<'ios.xcode-select--not_set'>) => (
  <Typography.Paragraph>
    xcode-select path not selected. <code>xcode-select -p</code> failed. To fix
    it run this command:
    <CliCommand
      title="Select Xcode version foo bar baz"
      // TODO provide latest path to installed xcode from /Applications
      command={`sudo xcode-select -switch <path/to/>/Xcode.app`}
    />
  </Typography.Paragraph>
);

const XcodeSelectNoXcode = (
  _props: PropsFor<'ios.xcode-select--no_xcode_selected'>,
) => (
  <Typography.Paragraph>
    xcode-select has no Xcode selected. To fix it it run this command:
    <CliCommand
      title="Select Xcode version foo bar baz"
      // TODO provide latest path to installed xcode from /Applications
      command={`sudo xcode-select -switch <path/to/>/Xcode.app`}
    />
  </Typography.Paragraph>
);

const XcodeSelectNonExistingSelected = (
  props: PropsFor<'ios.xcode-select--nonexisting_selected'>,
) => (
  <Typography.Paragraph>
    xcode-select is pointing at a path that does not exist:
    <CodeBlock size="s">{props.selected}</CodeBlock>
    <CliCommand
      title="Select existing Xcode application"
      // TODO provide latest path to installed xcode from /Applications
      command={`sudo xcode-select -switch <path/to/>/Xcode.app`}
    />
  </Typography.Paragraph>
);

const IosSdkNotInstalled = (_props: PropsFor<'ios.sdk--not_installed'>) => (
  <Typography.Paragraph>
    The iOS SDK is not installed on your machine. See{' '}
    <a
      href="https://fbflipper.com/docs/getting-started/troubleshooting/install-ios-sdk/"
      target="_blank">
      Install iOS SDK instructions
    </a>
    .
  </Typography.Paragraph>
);

const IosSdkInstalled = (props: PropsFor<'ios.sdk--installed'>) => (
  <div>
    <Typography.Paragraph>
      The iOS SDK is installed on your machine. Installed platforms:
    </Typography.Paragraph>
    <List listStyle="none">
      {props.platforms.map((platform, i) => (
        <List.Item key={i}>{platform}</List.Item>
      ))}
    </List>
  </div>
);

const IosXctraceInstalled = (props: PropsFor<'ios.xctrace--installed'>) => (
  <Typography.Paragraph>
    xctrace is installed.
    <CodeBlock>{props.output}</CodeBlock>
  </Typography.Paragraph>
);
const IosXctraceNotInstalled = (
  props: PropsFor<'ios.xctrace--not_installed'>,
) => (
  <Typography.Paragraph>
    xctrace is not available. Please ensure you have Xcode installed and are
    running a recent version (https://developer.apple.com/xcode/).
    <CodeBlock>{props.message}</CodeBlock>
  </Typography.Paragraph>
);

const IdbNoContext = (_props: PropsFor<'ios.idb--no_context'>) => (
  <Typography.Paragraph>
    Not enough context to check IDB installation. Needs to be run through
    Flipper UI.
  </Typography.Paragraph>
);

const IdbPhysicalDeviceDisabled = (
  _props: PropsFor<'ios.idb--physical_device_disabled'>,
) => (
  <Typography.Paragraph>
    Physical device support disabled in flipper settings, check skipped.
  </Typography.Paragraph>
);

const IosIdbInstalled = (_props: PropsFor<'ios.idb--installed'>) => (
  <Typography.Paragraph>
    Flipper is configured to use your IDB installation.
  </Typography.Paragraph>
);

const Skipped = (props: PropsFor<'skipped'>) => (
  <Typography.Paragraph>{props.reason}</Typography.Paragraph>
);

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
  'android.sdk--not_installed': AndroidSdkNotInstalled,

  'ios.xcode--installed': IosXcodeInstalled,
  'ios.xcode--not_installed': Noop,

  'ios.xcode-select--set': XcodeSelectSet,
  'ios.xcode-select--not_set': XcodeSelectNotSet,
  'ios.xcode-select--no_xcode_selected': XcodeSelectNoXcode,
  'ios.xcode-select--nonexisting_selected': XcodeSelectNonExistingSelected,
  'ios.xcode-select--noop': Noop,
  'ios.xcode-select--custom_path': Noop,
  'ios.xcode-select--old_version_selected': Noop,

  'ios.sdk--installed': IosSdkInstalled,
  'ios.sdk--not_installed': IosSdkNotInstalled,

  'ios.xctrace--installed': IosXctraceInstalled,
  'ios.xctrace--not_installed': IosXctraceNotInstalled,

  'ios.idb--no_context': IdbNoContext,
  'ios.idb--physical_device_disabled': IdbPhysicalDeviceDisabled,
  'ios.idb--not_installed_but_present': Noop,
  'ios.idb--not_installed': Noop,
  'ios.idb--installed': IosIdbInstalled,

  'doctor-failed': Noop,

  skipped: Skipped,
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
  const OtherComp = moreMessageToComp[id];
  if (OtherComp != null) {
    return <OtherComp {...props} />;
  } else if (id in messageToComp) {
    const Comp = messageToComp[id];
    return <Comp {...props} />;
  }

  throw new Error(`Doctor: unexpected key "${id}"`);
};

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export namespace FlipperDoctor {
  export type EnvironmentInfo = {
    SDKs: {
      'iOS SDK': {
        Platforms: string[];
      };
      'Android SDK':
        | {
            'API Levels': string[] | 'Not Found';
            'Build Tools': string[] | 'Not Found';
            'System Images': string[] | 'Not Found';
            'Android NDK': string | 'Not Found';
          }
        | 'Not Found';
    };
    IDEs: {
      Xcode: {
        version: string;
        path: string;
      };
    };
  };

  export type HealthcheckCategory = {
    label: string;
    isSkipped: false;
    isRequired: boolean;
    healthchecks: Healthcheck[];
  };

  export type SkippedHealthcheckCategory = {
    label: string;
    isSkipped: true;
    skipReason: string;
  };

  export type Healthchecks = {
    common: HealthcheckCategory | SkippedHealthcheckCategory;
    android: HealthcheckCategory | SkippedHealthcheckCategory;
    ios: HealthcheckCategory | SkippedHealthcheckCategory;
  };

  export type Settings = {
    idbPath: string;
    enablePhysicalIOS: boolean;
  };

  export type Healthcheck = {
    key: string;
    label: string;
    isRequired?: boolean;
    run?: (
      env: EnvironmentInfo,
      settings?: Settings,
    ) => Promise<HealthcheckRunResult>;
  };

  export type CliCommand = {
    title: string;
    command: string;
  };

  export type HealthcheckRunResult = {
    hasProblem: boolean;
    message: MessageIdWithParams;
  };

  export type SubprocessHealtcheckRunResult =
    | (HealthcheckRunResult & {
        hasProblem: true;
      })
    | (HealthcheckRunResult & {
        hasProblem: false;
        stdout: string;
      });

  export type CategoryResult = [
    string,
    {
      label: string;
      results: Array<{
        key: string;
        label: string;
        isRequired: boolean;
        result: {hasProblem: boolean};
      }>;
    },
  ];

  export type Dictionary<T> = {[key: string]: T};

  export type HealthcheckStatus =
    | 'IN_PROGRESS'
    | 'SUCCESS'
    | 'FAILED'
    | 'SKIPPED'
    | 'WARNING';

  export type HealthcheckResult = {
    status: HealthcheckStatus;
    isAcknowledged?: boolean;
    message?: MessageIdWithParams;
  };

  export type HealthcheckReportItem = {
    key: string;
    label: string;
    result: HealthcheckResult;
  };

  export type HealthcheckReportCategory = {
    key: string;
    label: string;
    result: HealthcheckResult;
    checks: Dictionary<HealthcheckReportItem>;
  };

  export type HealthcheckReport = {
    result: HealthcheckResult;
    categories: Dictionary<HealthcheckReportCategory>;
  };

  export type HealthcheckSettings = {
    settings: {
      enableAndroid: boolean;
      enableIOS: boolean;
      enablePhysicalIOS: boolean;
      idbPath: string;
    };
  };

  /**
   * key - message id
   * value - params of message function
   */
  export type HealthcheckResultMessageMapping = {
    'common.openssl--installed': [{output: string}];
    'common.openssl--not_installed': [{output: string}];

    'common.watchman--installed': [];
    'common.watchman--not_installed': [];

    'android.android-studio--installed': [];
    'android.android-studio--not_installed': [{platform: string}];

    'android.sdk--no_ANDROID_HOME': [];
    'android.sdk--invalid_ANDROID_HOME': [
      {androidHome: string; existingAndroidHome: string | null},
    ];
    'android.sdk--no_android_sdk': [{platformToolsDir: string}];

    'android.sdk--no_ANDROID_SDK_ROOT': [];
    'android.sdk--unexisting_folder_ANDROID_SDK_ROOT': [];
    'android.sdk--installed': [{output: string}];
    'android.sdk--not_installed': [{output: string}];

    'ios.xcode--installed': [{version: string; path: string}];
    'ios.xcode--not_installed': [];

    'ios.xcode-select--set': [{selected: string}];
    'ios.xcode-select--not_set': [{message: string}];
    'ios.xcode-select--no_xcode_selected': [];
    'ios.xcode-select--noop': [];
    'ios.xcode-select--custom_path': [];
    'ios.xcode-select--old_version_selected': [
      {
        selectedVersion: string;
        latestXCode: string;
      },
    ];
    'ios.xcode-select--nonexisting_selected': [{selected: string}];

    'ios.sdk--installed': [{platforms: string[]}];
    'ios.sdk--not_installed': [];

    'ios.xctrace--installed': [{output: string}];
    'ios.xctrace--not_installed': [{message: string}];

    'ios.idb--no_context': [];
    'ios.idb--physical_device_disabled': [];
    'ios.idb--not_installed_but_present': [
      {idbPath: string; idbInPath: string},
    ];
    'ios.idb--not_installed': [{idbPath: string; hasIdbCompanion: boolean}];
    'ios.idb--installed': [];

    'doctor-failed': [{error: any}];

    skipped: [{reason: string}];
  };

  export type MessageIdWithParams = {
    [K in keyof HealthcheckResultMessageMapping]: HealthcheckResultMessageMapping[K][0] extends void
      ? [K]
      : [K, ...HealthcheckResultMessageMapping[K]];
  }[keyof HealthcheckResultMessageMapping];
}

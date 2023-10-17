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

  export type HealthcheckRunResult = {
    hasProblem: boolean;
    message: string;
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
    message?: string;
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
}

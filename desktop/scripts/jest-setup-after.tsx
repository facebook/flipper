/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// jest-setup-after will run after Jest has been initialized, so that it can be adapted.

// eslint-disable-next-line node/no-extraneous-import
import {cleanup} from '@testing-library/react';
import {resolve} from 'path';
import os from 'os';

(global as any).FlipperRenderHostInstance = createStubRenderHost();

import {TestUtils} from 'flipper-plugin';
import {
  FlipperServerConfig,
  ReleaseChannel,
  Tristate,
  parseEnvironmentVariables,
  uuid,
} from 'flipper-common';

// Only import the type!
// eslint-disable-next-line node/no-extraneous-import
import type {RenderHost} from 'flipper-ui/src/RenderHost';

(global as any).flipperConfig = {
  theme: 'light',
  entryPoint: 'bundle.js',
  debug: true,
  graphSecret: 'TEST_GRAPH_SECRET',
  appVersion: '0.0.0',
  sessionId: 'TEST_SESSION_ID',
  unixname: 'Luke',
  authToken: 'TEST_AUTH_TOKEN',
};

const test = global.test;
if (!test) {
  throw new Error('Failed jest test object');
}
/**
 * This test will not be executed on Github / SandCastle,
 * since, for example, it relies on precise timer reliability
 */
(test as any).local = function local() {
  const fn = process.env.SANDCASTLE || process.env.CI ? test.skip : test;
  // eslint-disable-next-line
  return fn.apply(null, arguments as any);
};

/**
 * This test will only run on non-windows machines
 */
(test as any).unix = function local() {
  const fn = process.platform === 'win32' ? test.skip : test;
  // eslint-disable-next-line
  return fn.apply(null, arguments as any);
};

beforeEach(() => {
  // Fresh mock flipperServer for every test
  (global as any).FlipperRenderHostInstance = createStubRenderHost();
});

afterEach(cleanup);

console.debug = function () {
  // Intentional noop, we don't want debug statements in Jest runs
};

// make perf tools available in Node (it is available in Browser / Electron just fine)
import {PerformanceObserver, performance} from 'perf_hooks';
// Object.freeze(performance);
// Object.freeze(Object.getPrototypeOf(performance));
// Something in our unit tests is messing with the performance global
// This fixes that.
let _performance = performance;
Object.defineProperty(global, 'performance', {
  get() {
    return _performance;
  },
  set(value) {
    _performance = value;

    if (typeof _performance.mark === 'undefined') {
      _performance.mark = (_markName: string, _markOptions?) => {
        return {
          name: '',
          detail: '',
          duration: 0,
          entryType: '',
          startTime: 0,
          toJSON() {},
        };
      };
    }

    if (typeof _performance.clearMarks === 'undefined') {
      _performance.clearMarks = () => {};
    }
    if (typeof _performance.measure === 'undefined') {
      _performance.measure = (
        _measureName: string,
        _startOrMeasureOptions?,
        _endMark?: string | undefined,
      ) => {
        return {
          name: '',
          detail: '',
          duration: 0,
          entryType: '',
          startTime: 0,
          toJSON() {},
        };
      };
    }
  },
});

(global as any).PerformanceObserver = PerformanceObserver;

// https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
Object.defineProperty(global, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

function createStubRenderHost(): RenderHost {
  const rootPath = resolve(__dirname, '..');
  const stubConfig: FlipperServerConfig = {
    sessionId: uuid(),
    environmentInfo: {
      processId: process.pid,
      appVersion: '0.0.0',
      isProduction: false,
      isHeadlessBuild: false,
      releaseChannel: ReleaseChannel.DEFAULT,
      flipperReleaseRevision: '000',
      os: {
        arch: process.arch,
        platform: process.platform,
        unixname: os.userInfo().username,
      },
      versions: {
        node: process.versions.node,
        platform: os.release(),
      },
    },
    env: parseEnvironmentVariables(process.env),
    gatekeepers: {
      TEST_PASSING_GK: true,
      TEST_FAILING_GK: false,
    },
    launcherSettings: {
      ignoreLocalPin: false,
      releaseChannel: ReleaseChannel.DEFAULT,
    },
    paths: {
      appPath: rootPath,
      desktopPath: `/dev/null`,
      execPath: process.execPath,
      homePath: `/dev/null`,
      staticPath: resolve(rootPath, 'static'),
      tempPath: os.tmpdir(),
    },
    processConfig: {
      disabledPlugins: [],
      lastWindowPosition: null,
      launcherEnabled: false,
      launcherMsg: null,
      screenCapturePath: `/dev/null`,
      updaterEnabled: true,
      suppressPluginUpdateNotifications: false,
    },
    settings: {
      androidHome: `/dev/null`,
      darkMode: 'light',
      enableAndroid: false,
      enableIOS: false,
      enablePhysicalIOS: false,
      enablePrefetching: Tristate.False,
      idbPath: `/dev/null`,
      showWelcomeAtStartup: false,
      suppressPluginErrors: false,
      persistDeviceData: false,
      enablePluginMarketplace: false,
      marketplaceURL: '',
      enablePluginMarketplaceAutoUpdate: true,
    },
    validWebSocketOrigins: [],
  };

  return {
    hasFocus() {
      return true;
    },
    onIpcEvent() {},
    sendIpcEvent() {},
    shouldUseDarkColors() {
      return false;
    },
    restartFlipper() {},
    serverConfig: stubConfig,
    GK(gk: string) {
      return stubConfig.gatekeepers[gk] ?? false;
    },
    flipperServer: TestUtils.createFlipperServerMock(),
    async requirePlugin(path: string) {
      return {plugin: require(path)};
    },
    getStaticResourceUrl(relativePath): string {
      return 'file://' + resolve(rootPath, 'static', relativePath);
    },
  };
}

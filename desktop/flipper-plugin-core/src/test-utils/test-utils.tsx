/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {fsConstants, InstalledPluginDetails} from 'flipper-common';

import {FlipperServer, FlipperServerCommands} from 'flipper-common';
import {Device} from '../plugin/DevicePlugin';
import {FlipperLib} from '../plugin/FlipperLib';
import {PluginFactory} from '../plugin/Plugin';
import {
  FlipperDevicePluginModule,
  FlipperPluginModule,
  SandyPluginDefinition,
} from '../plugin/SandyPluginDefinition';
import {stubLogger} from '../utils/Logger';

declare const process: any;

export interface StartPluginOptions {
  initialState?: Record<string, any>;
  isArchived?: boolean;
  isBackgroundPlugin?: boolean;
  startUnactivated?: boolean;
  /** Provide a set of unsupported methods to simulate older clients that don't support certain methods yet */
  unsupportedMethods?: string[];
  /**
   * Provide a set of GKs that are enabled in this test.
   */
  GKs?: string[];
  testDevice?: Device;
}

export function createStubFunction(): jest.Mock<any, any> {
  // we shouldn't be usign jest.fn() outside a unit test, as it would not resolve / cause jest to be bundled up!
  if (typeof jest !== 'undefined') {
    return jest.fn();
  }
  return (() => {
    console.warn('Using a stub function outside a test environment!');
  }) as any;
}

export function createMockFlipperLib(options?: StartPluginOptions): FlipperLib {
  return {
    isFB: false,
    logger: stubLogger,
    enableMenuEntries: createStubFunction(),
    createPaste: createStubFunction(),
    GK(gk: string) {
      return options?.GKs?.includes(gk) || false;
    },
    selectPlugin: createStubFunction(),
    writeTextToClipboard: createStubFunction(),
    openLink: createStubFunction(),
    showNotification: createStubFunction(),
    exportFile: createStubFunction(),
    exportFileBinary: createStubFunction(),
    importFile: createStubFunction(),
    paths: {
      appPath: process.cwd(),
      homePath: `/dev/null`,
      staticPath: process.cwd(),
      tempPath: `/dev/null`,
    },
    environmentInfo: {
      os: {
        arch: 'Test',
        unixname: 'test',
        platform: 'linux',
      },
      env: {},
    },
    intern: {
      graphGet: createStubFunction(),
      graphPost: createStubFunction(),
      isLoggedIn: createStubFunction(),
    },
    remoteServerContext: {
      childProcess: {
        exec: createStubFunction(),
      },
      fs: {
        access: createStubFunction(),
        pathExists: createStubFunction(),
        unlink: createStubFunction(),
        mkdir: createStubFunction(),
        rm: createStubFunction(),
        copyFile: createStubFunction(),
        constants: fsConstants,
        stat: createStubFunction(),
        readlink: createStubFunction(),
        readFile: createStubFunction(),
        readFileBinary: createStubFunction(),
        writeFile: createStubFunction(),
        writeFileBinary: createStubFunction(),
      },
      downloadFile: createStubFunction(),
    },
  };
}

export function createMockPluginDetails(
  details?: Partial<InstalledPluginDetails>,
): InstalledPluginDetails {
  return {
    id: 'TestPlugin',
    dir: '',
    name: 'TestPlugin',
    specVersion: 0,
    entry: '',
    isActivatable: true,
    main: '',
    source: '',
    title: 'Testing Plugin',
    version: '',
    ...details,
  };
}

export function createTestPlugin<T extends PluginFactory<any, any, any, any>>(
  implementation: Pick<FlipperPluginModule<T>, 'plugin'> &
    Partial<FlipperPluginModule<T>>,
  details?: Partial<InstalledPluginDetails>,
) {
  return new SandyPluginDefinition(
    createMockPluginDetails({
      pluginType: 'client',
      ...details,
    }),
    {
      Component() {
        return null;
      },
      ...implementation,
    },
  );
}

export function createTestDevicePlugin(
  implementation: Pick<FlipperDevicePluginModule, 'devicePlugin'> &
    Partial<FlipperDevicePluginModule>,
  details?: Partial<InstalledPluginDetails>,
) {
  return new SandyPluginDefinition(
    createMockPluginDetails({
      pluginType: 'device',
      ...details,
    }),
    {
      supportsDevice() {
        return true;
      },
      Component() {
        return null;
      },
      ...implementation,
    },
  );
}

export function createFlipperServerMock(
  overrides?: Partial<FlipperServerCommands>,
): FlipperServer {
  return {
    async connect() {},
    on: createStubFunction(),
    off: createStubFunction(),
    exec: jest
      .fn()
      .mockImplementation(
        async (cmd: keyof FlipperServerCommands, ...args: any[]) => {
          if (overrides?.[cmd]) {
            return (overrides[cmd] as any)(...args);
          }
          console.warn(
            `Empty server response stubbed for command '${cmd}', set 'getRenderHostInstance().flipperServer.exec' in your test to override the behavior.`,
          );
          return undefined;
        },
      ),
    close: createStubFunction(),
  };
}

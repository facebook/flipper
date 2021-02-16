/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fse from 'fs-extra';

import {initTemplate} from '../commands/init';
import {normalizePath} from 'flipper-test-utils';

let files: Record<string, string> = {};

beforeEach(() => {
  function ensureDir() {
    // no implementation
  }
  function writeFile(name: string, contents: string) {
    files[normalizePath(name)] = contents;
  }

  files = {};
  jest.mock('fs-extra', () => jest.fn());
  // @ts-ignore
  fse.ensureDir = ensureDir;
  // @ts-ignore
  fse.writeFile = writeFile;
});

afterEach(() => {
  // @ts-ignore
  // fse.ensureDir.mockRestore();
  // @ts-ignore
  // fs.writeFile.mockRestore();
});

test('It generates the correct files for client plugin', async () => {
  await initTemplate(
    'my weird Package %name. etc',
    'Nice title',
    'client',
    undefined,
    '/dev/null',
  );
  expect(files).toMatchInlineSnapshot(`
    Object {
      "/dev/null/.gitignore": "node_modules
    dist/
    ",
      "/dev/null/babel.config.js": "module.exports = {
        presets: [
            '@babel/preset-typescript', 
            '@babel/preset-react', 
            ['@babel/preset-env', {targets: {node: 'current'}}]
        ],
    };
    ",
      "/dev/null/package.json": "{
      \\"$schema\\": \\"https://fbflipper.com/schemas/plugin-package/v2.json\\",
      \\"name\\": \\"flipper-plugin-my-weird-package-name-etc\\",
      \\"id\\": \\"my weird Package %name. etc\\",
      \\"version\\": \\"1.0.0\\",
      \\"pluginType\\": \\"client\\",
      \\"main\\": \\"dist/bundle.js\\",
      \\"flipperBundlerEntry\\": \\"src/index.tsx\\",
      \\"license\\": \\"MIT\\",
      \\"keywords\\": [
        \\"flipper-plugin\\"
      ],
      \\"icon\\": \\"apps\\",
      \\"title\\": \\"Nice title\\",
      \\"scripts\\": {
        \\"lint\\": \\"flipper-pkg lint\\",
        \\"prepack\\": \\"flipper-pkg lint && flipper-pkg bundle\\",
        \\"build\\": \\"flipper-pkg bundle\\",
        \\"watch\\": \\"flipper-pkg bundle --watch\\",
        \\"test\\": \\"jest --no-watchman\\"
      },
      \\"peerDependencies\\": {
        \\"flipper\\": \\"latest\\",
        \\"flipper-plugin\\": \\"latest\\",
        \\"antd\\": \\"latest\\"
      },
      \\"devDependencies\\": {
        \\"@babel/preset-react\\": \\"latest\\",
        \\"@babel/preset-typescript\\": \\"latest\\",
        \\"@testing-library/react\\": \\"latest\\",
        \\"@types/jest\\": \\"latest\\",
        \\"@types/react\\": \\"latest\\",
        \\"@types/react-dom\\": \\"latest\\",
        \\"antd\\": \\"latest\\",
        \\"flipper\\": \\"latest\\",
        \\"flipper-plugin\\": \\"latest\\",
        \\"flipper-pkg\\": \\"latest\\",
        \\"jest\\": \\"latest\\",
        \\"typescript\\": \\"latest\\"
      }
    }
    ",
      "/dev/null/src/__tests__/test.spec.tsx": "import {TestUtils} from 'flipper-plugin';
    import * as Plugin from '..';

    // Read more: https://fbflipper.com/docs/tutorial/js-custom#testing-plugin-logic
    // API: https://fbflipper.com/docs/tutorial/js-custom#testing-plugin-logic
    test('It can store data', () => {
      const {instance, sendEvent} = TestUtils.startPlugin(Plugin);

      expect(instance.data.get()).toEqual({});

      sendEvent('newData', {id: 'firstID'});
      sendEvent('newData', {id: 'secondID'});

      expect(instance.data.get()).toMatchInlineSnapshot(\`
        Object {
          \\"firstID\\": Object {
            \\"id\\": \\"firstID\\",
          },
          \\"secondID\\": Object {
            \\"id\\": \\"secondID\\",
          },
        }
      \`);
    });

    // Read more: https://fbflipper.com/docs/tutorial/js-custom#testing-plugin-logic
    // API: https://fbflipper.com/docs/tutorial/js-custom#testing-plugin-logic
    test('It can render data', async () => {
      const {instance, renderer, sendEvent} = TestUtils.renderPlugin(Plugin);

      expect(instance.data.get()).toEqual({});

      sendEvent('newData', {id: 'firstID'});
      sendEvent('newData', {id: 'secondID'});

      expect(await renderer.findByTestId('firstID')).not.toBeNull();
      expect(await renderer.findByTestId('secondID')).toMatchInlineSnapshot(\`
        <pre
          data-testid=\\"secondID\\"
        >
          {\\"id\\":\\"secondID\\"}
        </pre>
      \`);
    });
    ",
      "/dev/null/src/index.tsx": "import React from 'react';
    import {PluginClient, usePlugin, createState, useValue, Layout} from 'flipper-plugin';

    type Data = {
      id: string;
      message?: string;
    };

    type Events = {
      newData: Data;
    };

    // Read more: https://fbflipper.com/docs/tutorial/js-custom#creating-a-first-plugin
    // API: https://fbflipper.com/docs/extending/flipper-plugin#pluginclient
    export function plugin(client: PluginClient<Events, {}>) {
      const data = createState<Record<string, Data>>({}, {persist: 'data'});

      client.onMessage('newData', (newData) => {
        data.update((draft) => {
          draft[newData.id] = newData;
        });
      });

      client.addMenuEntry({
        action: 'clear',
        handler: async () => {
          data.set({});
        },
      });

      return {data};
    }

    // Read more: https://fbflipper.com/docs/tutorial/js-custom#building-a-user-interface-for-the-plugin
    // API: https://fbflipper.com/docs/extending/flipper-plugin#react-hooks
    export function Component() {
      const instance = usePlugin(plugin);
      const data = useValue(instance.data);

      return (
        <Layout.ScrollContainer>
          {Object.entries(data).map(([id, d]) => (
            <pre key={id} data-testid={id}>
              {JSON.stringify(d)}
            </pre>
          ))}
        </Layout.ScrollContainer>
      );
    }
    ",
      "/dev/null/tsconfig.json": "{
      \\"compilerOptions\\": {
        \\"target\\": \\"ES2017\\",
        \\"module\\": \\"ES6\\",
        \\"jsx\\": \\"react\\",
        \\"sourceMap\\": true,
        \\"noEmit\\": true,
        \\"strict\\": true,
        \\"moduleResolution\\": \\"node\\",
        \\"esModuleInterop\\": true,
        \\"forceConsistentCasingInFileNames\\": true
      },
      \\"files\\": [\\"src/index.tsx\\"]
    }
    ",
    }
  `);
});

test('It generates the correct files for device plugin', async () => {
  await initTemplate(
    'my weird Package %name. etc',
    'Nice title',
    'device',
    ['iOS', 'Android'],
    '/dev/null',
  );
  expect(files).toMatchInlineSnapshot(`
    Object {
      "/dev/null/.gitignore": "node_modules
    dist/
    ",
      "/dev/null/babel.config.js": "module.exports = {
        presets: [
            '@babel/preset-typescript', 
            '@babel/preset-react', 
            ['@babel/preset-env', {targets: {node: 'current'}}]
        ],
    };
    ",
      "/dev/null/package.json": "{
      \\"$schema\\": \\"https://fbflipper.com/schemas/plugin-package/v2.json\\",
      \\"name\\": \\"flipper-plugin-my-weird-package-name-etc\\",
      \\"id\\": \\"my weird Package %name. etc\\",
      \\"version\\": \\"1.0.0\\",
      \\"pluginType\\": \\"device\\",
      \\"supportedDevices\\": [{\\"os\\":\\"iOS\\"},{\\"os\\":\\"Android\\"}],
      \\"main\\": \\"dist/bundle.js\\",
      \\"flipperBundlerEntry\\": \\"src/index.tsx\\",
      \\"license\\": \\"MIT\\",
      \\"keywords\\": [
        \\"flipper-plugin\\"
      ],
      \\"icon\\": \\"apps\\",
      \\"title\\": \\"Nice title\\",
      \\"scripts\\": {
        \\"lint\\": \\"flipper-pkg lint\\",
        \\"prepack\\": \\"flipper-pkg lint && flipper-pkg bundle\\",
        \\"build\\": \\"flipper-pkg bundle\\",
        \\"watch\\": \\"flipper-pkg bundle --watch\\",
        \\"test\\": \\"jest --no-watchman\\"
      },
      \\"peerDependencies\\": {
        \\"flipper\\": \\"latest\\",
        \\"flipper-plugin\\": \\"latest\\",
        \\"antd\\": \\"latest\\"
      },
      \\"devDependencies\\": {
        \\"@babel/preset-react\\": \\"latest\\",
        \\"@babel/preset-typescript\\": \\"latest\\",
        \\"@testing-library/react\\": \\"latest\\",
        \\"@types/jest\\": \\"latest\\",
        \\"@types/react\\": \\"latest\\",
        \\"@types/react-dom\\": \\"latest\\",
        \\"antd\\": \\"latest\\",
        \\"flipper\\": \\"latest\\",
        \\"flipper-plugin\\": \\"latest\\",
        \\"flipper-pkg\\": \\"latest\\",
        \\"jest\\": \\"latest\\",
        \\"typescript\\": \\"latest\\"
      }
    }
    ",
      "/dev/null/src/__tests__/test.spec.tsx": "import {TestUtils} from 'flipper-plugin';
    import * as Plugin from '..';

    // Read more: https://fbflipper.com/docs/tutorial/js-custom#testing-plugin-logic
    // API: https://fbflipper.com/docs/tutorial/js-custom#testing-plugin-logic
    test('It can store data', () => {
      const {instance, sendLogEntry} = TestUtils.startDevicePlugin(Plugin);

      expect(instance.data.get()).toEqual([]);

      sendLogEntry({
        date: new Date(1611854112859),
        message: 'test1',
        pid: 0,
        tag: 'test',
        tid: 1,
        type: 'error',
        app: 'X',
      });
      sendLogEntry({
        date: new Date(1611854117859),
        message: 'test2',
        pid: 2,
        tag: 'test',
        tid: 3,
        type: 'warn',
        app: 'Y',
      });

      expect(instance.data.get()).toMatchInlineSnapshot(\`
        Array [
          \\"test1\\",
          \\"test2\\",
        ]
      \`);
    });

    // Read more: https://fbflipper.com/docs/tutorial/js-custom#testing-plugin-logic
    // API: https://fbflipper.com/docs/tutorial/js-custom#testing-plugin-logic
    test('It can render data', async () => {
      const {instance, renderer, sendLogEntry} = TestUtils.renderDevicePlugin(
        Plugin,
      );

      expect(instance.data.get()).toEqual([]);

      sendLogEntry({
        date: new Date(1611854112859),
        message: 'test1',
        pid: 0,
        tag: 'test',
        tid: 1,
        type: 'error',
        app: 'X',
      });
      sendLogEntry({
        date: new Date(1611854117859),
        message: 'test2',
        pid: 2,
        tag: 'test',
        tid: 3,
        type: 'warn',
        app: 'Y',
      });

      expect(await renderer.findByTestId('0')).not.toBeNull();
      expect(await renderer.findByTestId('1')).toMatchInlineSnapshot();
    });
    ",
      "/dev/null/src/index.tsx": "import React from 'react';
    import {
      DevicePluginClient,
      usePlugin,
      createState,
      useValue,
      Layout,
    } from 'flipper-plugin';

    // Read more: https://fbflipper.com/docs/tutorial/js-custom#creating-a-first-plugin
    // API: https://fbflipper.com/docs/extending/flipper-plugin#pluginclient
    export function devicePlugin(client: DevicePluginClient) {
      const data = createState<string[]>([]);

      client.device.onLogEntry((entry) => {
        data.update((draft) => {
          draft.push(entry.message);
        });
      });

      client.addMenuEntry({
        action: 'clear',
        handler: async () => {
          data.set([]);
        },
      });

      return {data};
    }

    // Read more: https://fbflipper.com/docs/tutorial/js-custom#building-a-user-interface-for-the-plugin
    // API: https://fbflipper.com/docs/extending/flipper-plugin#react-hooks
    export function Component() {
      const instance = usePlugin(devicePlugin);
      const data = useValue(instance.data);

      return (
        <Layout.ScrollContainer>
          {Object.entries(data).map(([id, d]) => (
            <pre key={id} data-testid={id}>
              {JSON.stringify(d)}
            </pre>
          ))}
        </Layout.ScrollContainer>
      );
    }
    ",
      "/dev/null/tsconfig.json": "{
      \\"compilerOptions\\": {
        \\"target\\": \\"ES2017\\",
        \\"module\\": \\"ES6\\",
        \\"jsx\\": \\"react\\",
        \\"sourceMap\\": true,
        \\"noEmit\\": true,
        \\"strict\\": true,
        \\"moduleResolution\\": \\"node\\",
        \\"esModuleInterop\\": true,
        \\"forceConsistentCasingInFileNames\\": true
      },
      \\"files\\": [\\"src/index.tsx\\"]
    }
    ",
    }
  `);
});

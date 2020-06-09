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

test('It generates the correct files', async () => {
  await initTemplate('my weird Package %name. etc', 'Nice title', '/dev/null');
  expect(files).toMatchInlineSnapshot(`
    Object {
      "/dev/null/.gitignore": "node_modules
    dist/
    ",
      "/dev/null/package.json": "{
      \\"$schema\\": \\"https://fbflipper.com/schemas/plugin-package/v2.json\\",
      \\"name\\": \\"flipper-plugin-my-weird-package-name-etc\\",
      \\"id\\": \\"my weird Package %name. etc\\",
      \\"version\\": \\"1.0.0\\",
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
        \\"watch\\": \\"flipper-pkg bundle --watch\\"
      },
      \\"peerDependencies\\": {
        \\"flipper\\": \\"latest\\"
      },
      \\"devDependencies\\": {
        \\"@types/react\\": \\"latest\\",
        \\"@types/react-dom\\": \\"latest\\",
        \\"flipper\\": \\"latest\\",
        \\"flipper-pkg\\": \\"latest\\"
      }
    }
    ",
      "/dev/null/src/index.tsx": "import React from 'react';
    import {FlipperPlugin, View, KeyboardActions} from 'flipper';

    type State = {};

    type Data = {};

    type PersistedState = {
      data: Array<Data>;
    };

    export default class extends FlipperPlugin<State, any, PersistedState> {
      static keyboardActions: KeyboardActions = ['clear'];

      static defaultPersistedState: PersistedState = {
        data: [],
      };

      static persistedStateReducer = (
        persistedState: PersistedState,
        method: string,
        data: Data,
      ): PersistedState => {
        return {
          ...persistedState,
          data: persistedState.data.concat([data]),
        };
      };

      state = {};

      onKeyboardAction = (action: string) => {
        if (action === 'clear') {
          this.props.setPersistedState({data: []});
        }
      };

      render() {
        return (
          <View scrollable>
            {this.props.persistedState.data.map((d) => (
              <div>{JSON.stringify(d, null, 2)}<hr/></div>
            ))}
          </View>
        )
      }
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

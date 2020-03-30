/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {spawn} from 'child_process';
import memoize from 'lodash.memoize';
// $FlowFixMe
import stringify from 'canonical-json';

const TEST_TIMEOUT_MS = 30 * 1000;

const layoutPathsToExcludeFromSnapshots = [
  'id',
  'children.*',
  'extraInfo.linkedNode',
  'data.View.*.value',
  'data.View.*.*.value',
  'data.View.*.*.*.value',
  'data.Drawable.*.value',
  'data.LithoView.mountbounds',
  'data.Layout.height',
  'data.Layout.width',
  'data.*.typeface',
];

const params = {
  bin: process.env.FLIPPER_PATH || '/tmp/flipper-macos',
  securePort: process.env.SECURE_PORT || '8088',
  insecurePort: process.env.INSECURE_PORT || '8089',
  device: process.env.DEVICE,
};

if (!params.device) {
  console.warn(
    'No device specified. Test may fail if more than one is present.',
  );
}

const basicArgs = [
  '-v',
  ...(params.device ? ['--device', params.device] : []),
  '--secure-port',
  params.securePort,
  '--insecure-port',
  params.insecurePort,
];

const runHeadless = memoize((args: Array<string>): Promise<{
  output: Object,
  stderr: string,
}> => {
  return new Promise((resolve, reject) => {
    const stdoutChunks = [];
    const stderrChunks = [];
    console.info(`Running ${params.bin} ${args.join(' ')}`);
    const process = spawn(params.bin, args, {});
    process.stdout.setEncoding('utf8');
    process.stdout.on('data', (chunk) => {
      stdoutChunks.push(chunk);
    });
    process.stderr.on('data', (chunk) => {
      stderrChunks.push(chunk);
    });
    process.stdout.on('end', (chunk) => {
      const stdout = stdoutChunks.join('');
      const stderr = stderrChunks.join('');
      try {
        console.log(stderr);
        resolve({output: JSON.parse(stdout), stderr: stderr});
      } catch (e) {
        console.warn(stderr);
        reject(
          new Error(
            `Failed to parse headless output as JSON (${e.message}): ${stdout}`,
          ),
        );
      }
    });

    setTimeout(() => {
      process.kill('SIGINT');
    }, 20000);
  });
});

function getPluginState(app: string, plugin: string): Promise<string> {
  return runHeadless(basicArgs).then((result) => {
    const pluginStates = result.output.store.pluginStates;
    for (const pluginId of Object.keys(pluginStates)) {
      const matches = /([^#]+)#([^#]+)#([^#]+)#([^#]+)#([^#]+)/.exec(pluginId);
      if (
        matches &&
        matches.length === 6 &&
        matches[1] === app &&
        matches[5] === plugin
      ) {
        const id = matches[0];
        return pluginStates[id];
      }
    }
    throw new Error(`No matching plugin state for ${app}, ${plugin}`);
  });
}

test(
  'Flipper app appears in exported clients',
  () => {
    return runHeadless(basicArgs).then((result) => {
      expect(result.output.clients.map((c) => c.query.app)).toContain(
        'Flipper',
      );
    });
  },
  TEST_TIMEOUT_MS,
);

test(
  'Output includes fileVersion',
  () => {
    return runHeadless(basicArgs).then((result) => {
      expect(result.output.fileVersion).toMatch(/[0-9]+\.[0-9]+\.[0-9]+/);
    });
  },
  TEST_TIMEOUT_MS,
);

test(
  'Output includes device',
  () => {
    return runHeadless(basicArgs).then((result) => {
      expect(result.output.device).toBeTruthy();
    });
  },
  TEST_TIMEOUT_MS,
);

test(
  'Output includes flipperReleaseRevision',
  () => {
    return runHeadless(basicArgs).then((result) => {
      expect(result.output.flipperReleaseRevision).toBeTruthy();
    });
  },
  TEST_TIMEOUT_MS,
);

test(
  'Output includes store',
  () => {
    return runHeadless(basicArgs).then((result) => {
      expect(result.output.store).toBeTruthy();
    });
  },
  TEST_TIMEOUT_MS,
);

function stripUnstableLayoutAttributes(node: Object): Object {
  let newNode = node;
  for (const path of layoutPathsToExcludeFromSnapshots) {
    const parts = path.split('.');
    newNode = stripNode(newNode, parts);
  }
  return newNode;
}

function stripNode(node: any, path: Array<string>) {
  if (path.length === 0) {
    return 'PLACEHOLDER';
  }
  if (path[0] === '*') {
    if (Array.isArray(node)) {
      return node.map((e) => stripNode(e, path.slice(1)));
    }
    return Object.entries(node).reduce((acc, [key, val]) => {
      acc[key] = stripNode(val, path.slice(1));
      return acc;
    }, {});
  }
  if (!node[path[0]]) {
    return node;
  }
  return {...node, [path[0]]: stripNode(node[path[0]], path.slice(1))};
}

test('test layout snapshot stripping', () => {
  const beforeStripping = {
    my: {
      test: {
        id: 4,
        node: 7,
        something: 9,
        list: [1, 2, 3],
      },
    },
    id: 2,
    children: [1, 2, 3],
    extraInfo: {
      linkedNode: 55,
      somethingElse: 44,
    },
    data: {View: {bounds: {something: {value: 4}}}},
    other: 8,
  };
  const afterStripping = stripUnstableLayoutAttributes(beforeStripping);
  expect(afterStripping).toEqual({
    my: {
      test: {
        id: 4,
        node: 7,
        something: 9,
        list: [1, 2, 3],
      },
    },
    id: 'PLACEHOLDER',
    children: ['PLACEHOLDER', 'PLACEHOLDER', 'PLACEHOLDER'],
    extraInfo: {
      linkedNode: 'PLACEHOLDER',
      somethingElse: 44,
    },
    data: {View: {bounds: {something: {value: 'PLACEHOLDER'}}}},
    other: 8,
  });
});

test('Sample app layout hierarchy matches snapshot', () => {
  return getPluginState('Flipper', 'Inspector').then((result) => {
    const state = JSON.parse(result);
    expect(state.rootAXElement).toBe('com.facebook.flipper.sample');
    expect(state.rootElement).toBe('com.facebook.flipper.sample');
    const canonicalizedElements = Object.values(state.elements)
      .map((e) => {
        const stableizedElements = stripUnstableLayoutAttributes(e);
        return stringify(stableizedElements);
      })
      .sort();
    expect(canonicalizedElements).toMatchSnapshot();
  });
});

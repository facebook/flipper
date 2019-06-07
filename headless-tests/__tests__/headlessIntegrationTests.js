/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {spawn} from 'child_process';
// $FlowFixMe
import memoize from 'lodash.memoize';

const TEST_TIMEOUT_MS = 30 * 1000;

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

const runHeadless = memoize((args: Array<string>) => {
  return new Promise((resolve, reject) => {
    const stdoutChunks = [];
    const stderrChunks = [];
    console.info(`Running ${params.bin} ${args.join(' ')}`);
    const process = spawn(params.bin, args, {});
    process.stdout.setEncoding('utf8');
    process.stdout.on('data', chunk => {
      stdoutChunks.push(chunk);
    });
    process.stderr.on('data', chunk => {
      stderrChunks.push(chunk);
    });
    process.stdout.on('end', chunk => {
      const stdout = stdoutChunks.join('');
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        console.warn(stderrChunks.join(''));
        reject(
          `Failed to parse headless output as JSON (${e.message}): ${stdout}`,
        );
      }
    });

    setTimeout(() => {
      process.kill('SIGINT');
    }, 10000);
  });
});

test(
  'Flipper app appears in exported clients',
  () => {
    return runHeadless(basicArgs).then(result => {
      expect(result.clients.map(c => c.query.app)).toContain('Flipper');
    });
  },
  TEST_TIMEOUT_MS,
);

test(
  'Output includes fileVersion',
  () => {
    return runHeadless(basicArgs).then(result => {
      expect(result.fileVersion).toMatch(/[0-9]+\.[0-9]+\.[0-9]+/);
    });
  },
  TEST_TIMEOUT_MS,
);

test(
  'Output includes device',
  () => {
    return runHeadless(basicArgs).then(result => {
      expect(result.device).toBeTruthy();
    });
  },
  TEST_TIMEOUT_MS,
);

test(
  'Output includes flipperReleaseRevision',
  () => {
    return runHeadless(basicArgs).then(result => {
      expect(result.flipperReleaseRevision).toBeTruthy();
    });
  },
  TEST_TIMEOUT_MS,
);

test(
  'Output includes store',
  () => {
    return runHeadless(basicArgs).then(result => {
      expect(result.store).toBeTruthy();
    });
  },
  TEST_TIMEOUT_MS,
);

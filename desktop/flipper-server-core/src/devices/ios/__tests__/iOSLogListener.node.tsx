/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {iOSLogListener} from '../iOSLogListener';

test('can parse log', () => {
  const input = `Mar 25 17:06:38 iPhone symptomsd(SymptomEvaluator)[125] <Notice>: L2 Metrics on en0: rssi: -64 [0,0] -> -64, snr: 0 (cca [wake/total] self/other/intf): [0,0]/[0,0]/[0,0]/16 (txFrames/txReTx/txFail): 0/0/0 -> (was/is) 0/0`;
  const parsed = iOSLogListener.parseLogLine(input);
  expect(parsed).toMatchObject({
    message:
      'L2 Metrics on en0: rssi: -64 [0,0] -> -64, snr: 0 (cca [wake/total] self/other/intf): [0,0]/[0,0]/[0,0]/16 (txFrames/txReTx/txFail): 0/0/0 -> (was/is) 0/0',
    pid: 125,
    tag: 'symptomsd(SymptomEvaluator)',
    tid: 0,
    type: 'verbose',
  });
  // don't check everything as parsing is time zone dependent
  expect(parsed?.date.getMonth()).toBe(2);
  expect(parsed?.date.getMinutes()).toBe(6);
  expect(parsed?.date.getSeconds()).toBe(38);
});

test('all parseable', () => {
  const inputs = [
    `Mar 26 10:00:40 iPhone kernel(AppleBCMWLANCore)[0] <Notice>: LQM-WiFi: (2G) rxCrsGlitch=409 rxBphyCrsGlitch=226 rxStart=5672 rxBadPLCP=22 rxBphyBadPLCP=2 rxBadFCS=1740 rxFifo0Ovfl=0 rxFifo1Ovfl=0 rx_nobuf=0 rxAnyErr=48 rxResponseTimeout=612 rxNoDelim=18 rxFrmTooLong=0 rxFrmTooShort=10`,
    `Mar 26 10:04:37 iPhone nsurlsessiond[108] <Notice>: NDSession <7E18A208-B0F3-400D-916E-AD844AF190F2> Task <5331FB72-769E-4B22-8EDF-3D4944B1970A>.<5> did receive data (629823296 of 1953496076 total bytes)`,
    `Apr  2 03:00:26 iPhone locationd[4718] <Notice>: @ClxGps, Fix, 0, ll, N/A`,
  ];
  inputs.forEach((input) => {
    expect(iOSLogListener.parseLogLine(input)).toBeDefined();
  });
});

test('splits', () => {
  const input = `Mar 26 10:26:57 iPhone containermanagerd[4981] <Notice>: stat [<private>]: exists: 1, isDirectory: 0, fsNode: <~~~>
  \0Mar 26 10:26:57 iPhone containermanagerd[4981] <Notice>: [0] command=0, client=<<~~~>, u=<501/501/~~/2/1000>, uid=33, pid=5164, sandboxed=1, platform=2>, error=(none)
  \0Mar 26 10:26:57 iPhone installd(libsystem_containermanager.dylib)[5164] <Notice>: container_create_or_lookup_for_platform: success
  \0Mar 26 10:26:57 iPhone installd(libsystem_containermanager.dylib)[5164] <Notice>: container_copy_path: success
  \0Mar 26 10:26:57 iPhone containermanagerd[4981] <Notice>: stat [<private>]: exists: 1, isDirectory: 0, fsNode: <~~~>
  \0Mar 26 10:26:57 iPhone containermanagerd[4981] <Notice>: [0] command=7, client=<<~~~>, u=<501/501/~~/2/1000>, uid=33, pid=5164, sandboxed=1, platform=2>, error=(none)
  \0Mar 26 10:26:57 iPhone installd(libsystem_containermanager.dylib)[5164] <Notice>: container_is_transient: success`;
  expect(input.split('\0').length).toBe(7);
});

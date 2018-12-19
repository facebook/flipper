/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {
  parseCrashLog,
  getPluginKey,
  getPersistedState,
  getNewPersisitedStateFromCrashLog,
} from '../../../dispatcher/iOSDevice.js';
import BaseDevice from '../../../devices/BaseDevice';
import CrashReporterPlugin from '../../crash_reporter';
import type {PersistedState, Crash} from '../../crash_reporter';

function setDefaultPersistedState(defaultState: PersistedState) {
  CrashReporterPlugin.defaultPersistedState = defaultState;
}

function setNotificationID(notificationID: number) {
  CrashReporterPlugin.notificationID = notificationID;
}

function setCrashReporterPluginID(id: string) {
  CrashReporterPlugin.id = id;
}

function getCrash(
  id: number,
  callstack: string,
  name: string,
  reason: string,
): Crash {
  return {
    notificationID: id.toString(),
    callstack: callstack,
    reason: reason,
    name: name,
  };
}
beforeEach(() => {
  setNotificationID(0); // Resets notificationID to 0
  setDefaultPersistedState({crashes: []}); // Resets defaultpersistedstate
  setCrashReporterPluginID('CrashReporter');
});

afterAll(() => {
  // Reset values
  setNotificationID(0);
  setDefaultPersistedState({crashes: []});
  setCrashReporterPluginID('');
});

test('test the parsing of the reason for crash when log matches the predefined regex', () => {
  const log = 'Blaa Blaaa \n Blaa Blaaa \n Exception Type:  SIGSEGV';
  const crash = parseCrashLog(log);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('SIGSEGV');
  expect(crash.name).toEqual('SIGSEGV');
});
test('test the parsing of the crash log when log does not match the predefined regex but is alphanumeric', () => {
  const log = 'Blaa Blaaa \n Blaa Blaaa \n Blaa Blaaa';
  const crash = parseCrashLog(log);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('Cannot figure out the cause');
  expect(crash.name).toEqual('Cannot figure out the cause');
});

test('test the parsing of the reason for crash when log does not match the predefined regex contains unicode character', () => {
  const log = 'Blaa Blaaa \n Blaa Blaaa \n Exception Type:  🍕🐬';
  const crash = parseCrashLog(log);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('Cannot figure out the cause');
  expect(crash.name).toEqual('Cannot figure out the cause');
});
test('test the parsing of the reason for crash when log is empty', () => {
  const log = '';
  const crash = parseCrashLog(log);
  expect(crash.callstack).toEqual(log);
  expect(crash.reason).toEqual('Cannot figure out the cause');
  expect(crash.name).toEqual('Cannot figure out the cause');
});
test('test the getter of pluginKey with proper input', () => {
  const device = new BaseDevice('serial', 'emulator', 'test device');
  const pluginKey = getPluginKey(device, 'CrashReporter');
  expect(pluginKey).toEqual('serial#CrashReporter');
});
test('test the getter of pluginKey with undefined input', () => {
  const pluginKey = getPluginKey(undefined, 'CrashReporter');
  expect(pluginKey).toEqual('unknown#CrashReporter');
});
test('test defaultPersistedState of CrashReporterPlugin', () => {
  expect(CrashReporterPlugin.defaultPersistedState).toEqual({crashes: []});
});
test('test helper setdefaultPersistedState function', () => {
  const crash = getCrash(0, 'callstack', 'crash0', 'crash0');
  setDefaultPersistedState({crashes: [crash]});
  expect(CrashReporterPlugin.defaultPersistedState).toEqual({crashes: [crash]});
});
test('test getPersistedState for non-empty defaultPersistedState and undefined pluginState', () => {
  const crash = getCrash(0, 'callstack', 'crash0', 'crash0');
  setDefaultPersistedState({crashes: [crash]});
  const pluginStates = {};
  const perisistedState = getPersistedState(
    getPluginKey(null, CrashReporterPlugin.id),
    CrashReporterPlugin,
    pluginStates,
  );
  expect(perisistedState).toEqual({crashes: [crash]});
});
test('test getPersistedState for non-empty defaultPersistedState and defined pluginState', () => {
  const crash = getCrash(0, 'callstack', 'crash0', 'crash0');
  const pluginKey = getPluginKey(null, CrashReporterPlugin.id);
  setDefaultPersistedState({crashes: [crash]});
  const pluginStateCrash = getCrash(1, 'callstack', 'crash1', 'crash1');
  const pluginStates = {'unknown#CrashReporter': {crashes: [pluginStateCrash]}};
  const perisistedState = getPersistedState(
    pluginKey,
    CrashReporterPlugin,
    pluginStates,
  );
  expect(perisistedState).toEqual({crashes: [pluginStateCrash]});
});
test('test getNewPersisitedStateFromCrashLog for non-empty defaultPersistedState and defined pluginState', () => {
  const crash = getCrash(0, 'callstack', 'crash0', 'crash0');
  const pluginKey = getPluginKey(null, CrashReporterPlugin.id);
  setDefaultPersistedState({crashes: [crash]});
  const pluginStateCrash = getCrash(1, 'callstack', 'crash1', 'crash1');
  const pluginStates = {'unknown#CrashReporter': {crashes: [pluginStateCrash]}};
  const perisistedState = getPersistedState(
    pluginKey,
    CrashReporterPlugin,
    pluginStates,
  );
  const content = 'Blaa Blaaa \n Blaa Blaaa \n Exception Type:  SIGSEGV';
  expect(perisistedState).toEqual({crashes: [pluginStateCrash]});
  const newPersistedState = getNewPersisitedStateFromCrashLog(
    perisistedState,
    CrashReporterPlugin,
    content,
  );
  expect(newPersistedState).toEqual({
    crashes: [pluginStateCrash, getCrash(1, content, 'SIGSEGV', 'SIGSEGV')],
  });
});
test('test getNewPersisitedStateFromCrashLog for non-empty defaultPersistedState and undefined pluginState', () => {
  setNotificationID(0);
  const crash = getCrash(0, 'callstack', 'crash0', 'crash0');
  const pluginKey = getPluginKey(null, CrashReporterPlugin.id);
  setDefaultPersistedState({crashes: [crash]});
  const pluginStates = {};
  const perisistedState = getPersistedState(
    pluginKey,
    CrashReporterPlugin,
    pluginStates,
  );
  const content = 'Blaa Blaaa \n Blaa Blaaa \n Exception Type:  SIGSEGV';
  expect(perisistedState).toEqual({crashes: [crash]});
  const newPersistedState = getNewPersisitedStateFromCrashLog(
    perisistedState,
    CrashReporterPlugin,
    content,
  );
  expect(newPersistedState).toEqual({
    crashes: [crash, getCrash(1, content, 'SIGSEGV', 'SIGSEGV')],
  });
});
test('test getNewPersisitedStateFromCrashLog for non-empty defaultPersistedState and defined pluginState and improper crash log', () => {
  setNotificationID(0);
  const crash = getCrash(0, 'callstack', 'crash0', 'crash0');
  const pluginKey = getPluginKey(null, CrashReporterPlugin.id);
  setDefaultPersistedState({crashes: [crash]});
  const pluginStateCrash = getCrash(1, 'callstack', 'crash1', 'crash1');
  const pluginStates = {'unknown#CrashReporter': {crashes: [pluginStateCrash]}};
  const perisistedState = getPersistedState(
    pluginKey,
    CrashReporterPlugin,
    pluginStates,
  );
  const content = 'Blaa Blaaa \n Blaa Blaaa';
  expect(perisistedState).toEqual({crashes: [pluginStateCrash]});
  const newPersistedState = getNewPersisitedStateFromCrashLog(
    perisistedState,
    CrashReporterPlugin,
    content,
  );
  expect(newPersistedState).toEqual({
    crashes: [
      pluginStateCrash,
      getCrash(
        1,
        content,
        'Cannot figure out the cause',
        'Cannot figure out the cause',
      ),
    ],
  });
});

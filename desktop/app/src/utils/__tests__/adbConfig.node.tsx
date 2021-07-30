/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import adbConfig from '../adbConfig';

test('get host and port from ADB_SERVER_SOCKET', () => {
  process.env.ANDROID_ADB_SERVER_PORT = undefined;
  process.env.ADB_SERVER_SOCKET = 'tcp:127.0.0.1:5037';
  const {port, host} = adbConfig();
  expect(port).toBe(5037);
  expect(host).toBe('127.0.0.1');
});

test('get IPv6 address from ADB_SERVER_SOCKET', () => {
  process.env.ANDROID_ADB_SERVER_PORT = undefined;
  process.env.ADB_SERVER_SOCKET = 'tcp::::1:5037';
  const {host} = adbConfig();
  expect(host).toBe(':::1');
});

test('get port from ANDROID_ADB_SERVER_PORT', () => {
  process.env.ANDROID_ADB_SERVER_PORT = '1337';
  process.env.ADB_SERVER_SOCKET = undefined;
  const {port} = adbConfig();
  expect(port).toBe(1337);
});

test('prefer ADB_SERVER_SOCKET over ANDROID_ADB_SERVER_PORT', () => {
  process.env.ANDROID_ADB_SERVER_PORT = '1337';
  process.env.ADB_SERVER_SOCKET = 'tcp:127.0.0.1:5037';
  const {port} = adbConfig();
  expect(port).toBe(5037);
});

test('have defaults', () => {
  process.env.ANDROID_ADB_SERVER_PORT = undefined;
  process.env.ADB_SERVER_SOCKET = undefined;
  const {port, host} = adbConfig();
  expect(port).toBe(5037);
  expect(host).toBe('localhost');
});

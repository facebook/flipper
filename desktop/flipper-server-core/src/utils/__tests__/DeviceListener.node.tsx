/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  DeviceListener,
  DeviceLogListenerState,
  RESTART_CNT,
} from '../DeviceListener';

class TestDeviceListener extends DeviceListener {
  public connected = true;
  constructor(private listenerImpl: () => Promise<() => void>) {
    super(() => this.connected);
  }
  protected async startListener() {
    const stop = await this.listenerImpl();
    return stop;
  }

  setState<T extends DeviceLogListenerState>(
    ...args: T extends 'fatal' | 'zombie' ? [T, Error] : [T]
  ) {
    this._state.set(...args);
  }
}

describe('DeviceListener', () => {
  let device!: TestDeviceListener;
  let listenerFn!: jest.Mock;
  let stopFn!: jest.Mock;
  beforeEach(() => {
    stopFn = jest.fn();
    listenerFn = jest.fn().mockImplementation(() => stopFn);
    device = new TestDeviceListener(listenerFn);
  });

  test('Starts a listener if device is in "inactive" state and stops it', async () => {
    expect(device.state).toBe('inactive');

    const onStart = jest.fn();
    device.once('starting', onStart);

    expect(listenerFn).toBeCalledTimes(0);
    expect(onStart).toBeCalledTimes(0);

    await device.start();

    expect(listenerFn).toBeCalledTimes(1);
    expect(device.state).toBe('active');
    expect(device.error).toBe(undefined);
    expect(onStart).toBeCalledTimes(1);

    const onStop = jest.fn();
    device.once('stopping', onStop);

    expect(stopFn).toBeCalledTimes(0);
    expect(onStop).toBeCalledTimes(0);

    await device.stop();

    expect(stopFn).toBeCalledTimes(1);
    expect(device.state).toBe('inactive');
    expect(device.error).toBe(undefined);
    expect(onStop).toBeCalledTimes(1);
  });

  test('Fails to start a listener after RESTART_CNT retries', async () => {
    expect(device.state).toBe('inactive');

    const onStart = jest.fn();
    device.once('starting', onStart);

    expect(listenerFn).toBeCalledTimes(0);
    expect(onStart).toBeCalledTimes(0);

    const error = new Error('42');
    listenerFn.mockImplementation(() => {
      throw error;
    });

    await device.start();

    expect(listenerFn).toBeCalledTimes(RESTART_CNT + 1);
    expect(device.state).toBe('fatal');
    expect(device.error).toBe(error);
    expect(onStart).toBeCalledTimes(1);
  });
});

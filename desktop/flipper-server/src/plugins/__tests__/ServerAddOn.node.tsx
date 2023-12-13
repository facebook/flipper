/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ServerAddOnStartDetails, createControlledPromise} from 'flipper-common';
import {loadServerAddOn} from '../loadServerAddOn';
import {ServerAddOn} from '../ServerAddOn';
import {ServerAddOnModuleToDesktopConnection} from '../ServerAddOnModuleToDesktopConnection';
import {detailsInstalled, initialOwner, pluginName} from './utils';

jest.mock('../loadServerAddOn');
const loadServerAddOnMock = loadServerAddOn as jest.Mock;

describe('ServerAddOn', () => {
  const startServerAddOn = async (details: ServerAddOnStartDetails) => {
    const addOnCleanupMock = jest.fn();
    const addOnMock = jest.fn().mockImplementation(() => addOnCleanupMock);
    loadServerAddOnMock.mockImplementation(() => ({
      default: addOnMock,
    }));

    const flipperServer = {
      connect: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      exec: jest.fn(),
      close: jest.fn(),
      emit: jest.fn(),
    };

    expect(loadServerAddOnMock).toBeCalledTimes(0);
    expect(addOnMock).toBeCalledTimes(0);
    expect(addOnCleanupMock).toBeCalledTimes(0);

    const serverAddOn = await ServerAddOn.start(
      pluginName,
      details,
      initialOwner,
      flipperServer,
    );

    expect(loadServerAddOnMock).toBeCalledTimes(1);
    expect(loadServerAddOnMock).toBeCalledWith(pluginName, details);
    expect(addOnMock).toBeCalledTimes(1);
    expect(addOnMock).toBeCalledWith(
      expect.any(ServerAddOnModuleToDesktopConnection),
      {
        flipperServer,
      },
    );

    return {
      addOnCleanupMock,
      addOnMock,
      flipperServer,
      serverAddOn,
    };
  };

  describe.each([['installed', detailsInstalled]])('%s', (_name, details) => {
    test('stops the add-on when the initial owner is removed', async () => {
      const {serverAddOn, addOnCleanupMock} = await startServerAddOn(details);

      const controlledP = createControlledPromise<void>();
      addOnCleanupMock.mockImplementation(() => controlledP.promise);

      const removeOwnerRes = serverAddOn.removeOwner(initialOwner);

      expect(removeOwnerRes).toBeInstanceOf(Promise);
      expect(addOnCleanupMock).toBeCalledTimes(1);

      controlledP.resolve();
      await removeOwnerRes;
    });

    test('adds a new owner, stops the add-on when all owners are removed', async () => {
      const {serverAddOn, addOnCleanupMock} = await startServerAddOn(details);

      const newOwner = 'luke';
      serverAddOn.addOwner(newOwner);

      const controlledP = createControlledPromise<void>();
      addOnCleanupMock.mockImplementation(() => controlledP.promise);

      const removeOwnerRes1 = serverAddOn.removeOwner(initialOwner);
      expect(removeOwnerRes1).toBeUndefined();
      expect(addOnCleanupMock).toBeCalledTimes(0);

      const removeOwnerRes2 = serverAddOn.removeOwner(newOwner);

      expect(removeOwnerRes2).toBeInstanceOf(Promise);
      expect(addOnCleanupMock).toBeCalledTimes(1);

      controlledP.resolve();
      await removeOwnerRes2;
    });

    test('does nothing when removeOwner is called with a missing owner', async () => {
      const {serverAddOn, addOnCleanupMock} = await startServerAddOn(details);

      const missingOwner = 'luke';

      const removeOwnerRes = serverAddOn.removeOwner(missingOwner);
      expect(addOnCleanupMock).toBeCalledTimes(0);
      expect(removeOwnerRes).toBeUndefined();
    });

    test('calls stop only once when removeOwner is called twice with the same owner', async () => {
      const {serverAddOn, addOnCleanupMock} = await startServerAddOn(details);

      const controlledP = createControlledPromise<void>();
      addOnCleanupMock.mockImplementation(() => controlledP.promise);

      const removeOwnerRes1 = serverAddOn.removeOwner(initialOwner);

      expect(removeOwnerRes1).toBeInstanceOf(Promise);
      expect(addOnCleanupMock).toBeCalledTimes(1);

      const removeOwnerRes2 = serverAddOn.removeOwner(initialOwner);
      expect(removeOwnerRes2).toBeUndefined();
      expect(addOnCleanupMock).toBeCalledTimes(1);

      controlledP.resolve();
      await removeOwnerRes1;
    });
  });
});

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
import {PluginManager} from '../PluginManager';
import {ServerAddOnManager} from '../ServerAddManager';
import {ServerAddOnModuleToDesktopConnection} from '../ServerAddOnModuleToDesktopConnection';
import {detailsInstalled, initialOwner, pluginName} from './utils';

jest.mock('../loadServerAddOn');
const loadServerAddOnMock = loadServerAddOn as jest.Mock;

describe('PluginManager', () => {
  describe('server add-ons', () => {
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

      const pluginManager = new PluginManager(flipperServer);
      await pluginManager.startServerAddOn(pluginName, details, initialOwner);

      expect(loadServerAddOnMock).toBeCalledTimes(1);
      expect(loadServerAddOnMock).toBeCalledWith(pluginName, details);
      expect(addOnMock).toBeCalledTimes(1);
      expect(addOnMock).toBeCalledWith(
        expect.any(ServerAddOnModuleToDesktopConnection),
        {
          flipperServer,
        },
      );
      expect(pluginManager.serverAddOns.size).toBe(1);

      const serverAddOn = pluginManager.serverAddOns.get(pluginName);
      expect(serverAddOn).toBeInstanceOf(ServerAddOnManager);
      expect(serverAddOn!.state.is('active')).toBeTruthy();

      return {
        addOnCleanupMock,
        addOnMock,
        flipperServer,
        pluginManager,
      };
    };

    describe.each([['installed', detailsInstalled]])('%s', (_name, details) => {
      test('stops the add-on when the initial owner is removed', async () => {
        const {pluginManager, addOnCleanupMock} =
          await startServerAddOn(details);

        const controlledP = createControlledPromise<void>();
        addOnCleanupMock.mockImplementation(() => controlledP.promise);

        const stopPromise = pluginManager.stopServerAddOn(
          pluginName,
          initialOwner,
        );

        expect(pluginManager.serverAddOns.size).toBe(1);

        controlledP.resolve();
        await stopPromise;

        expect(addOnCleanupMock).toBeCalledTimes(1);
        expect(pluginManager.serverAddOns.size).toBe(0);
      });

      test('adds a new owner, stops the add-on when all owners are removed', async () => {
        const {pluginManager, addOnCleanupMock} =
          await startServerAddOn(details);

        const newOwner = 'luke';
        await pluginManager.startServerAddOn(pluginName, details, newOwner);
        expect(pluginManager.serverAddOns.size).toBe(1);

        await pluginManager.stopServerAddOn(pluginName, initialOwner);
        expect(addOnCleanupMock).toBeCalledTimes(0);
        expect(pluginManager.serverAddOns.size).toBe(1);

        const serverAddOn = pluginManager.serverAddOns.get(pluginName)!;
        expect(serverAddOn.state.is('active')).toBeTruthy();

        await pluginManager.stopServerAddOn(pluginName, newOwner);
        expect(addOnCleanupMock).toBeCalledTimes(1);
        expect(pluginManager.serverAddOns.size).toBe(0);

        await serverAddOn.state.wait('inactive');
      });

      test('concurrent calls to startServerAddOn start a single add-on', async () => {
        const addOnCleanupMock = jest.fn();
        const controlledP = createControlledPromise<() => void>();
        const addOnMock = jest
          .fn()
          .mockImplementation(() => controlledP.promise);
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

        const pluginManager = new PluginManager(flipperServer);

        const startP1 = pluginManager.startServerAddOn(
          pluginName,
          details,
          initialOwner,
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

        expect(pluginManager.serverAddOns.size).toBe(1);

        const newOwner = 'luke';
        const startP2 = pluginManager.startServerAddOn(
          pluginName,
          details,
          newOwner,
        );

        expect(loadServerAddOnMock).toBeCalledTimes(1);
        expect(addOnMock).toBeCalledTimes(1);
        expect(pluginManager.serverAddOns.size).toBe(1);

        controlledP.resolve(addOnCleanupMock);
        await startP1;
        await startP2;

        expect(loadServerAddOnMock).toBeCalledTimes(1);
        expect(addOnMock).toBeCalledTimes(1);
        expect(pluginManager.serverAddOns.size).toBe(1);

        const serverAddOn = pluginManager.serverAddOns.get(pluginName);
        expect(serverAddOn).toBeInstanceOf(ServerAddOnManager);
        expect(serverAddOn!.state.is('active')).toBeTruthy();
      });

      test('concurrent calls to stopServerAddOn stop add-on only once', async () => {
        const {pluginManager, addOnCleanupMock} =
          await startServerAddOn(details);

        const controlledP = createControlledPromise<void>();
        addOnCleanupMock.mockImplementation(() => controlledP.promise);

        expect(addOnCleanupMock).toBeCalledTimes(0);

        const stopP1 = pluginManager.stopServerAddOn(pluginName, initialOwner);
        expect(addOnCleanupMock).toBeCalledTimes(1);

        const stopP2 = pluginManager.stopServerAddOn(pluginName, initialOwner);
        expect(addOnCleanupMock).toBeCalledTimes(1);

        controlledP.resolve();
        await stopP1;
        await stopP2;

        expect(addOnCleanupMock).toBeCalledTimes(1);
      });
    });
  });
});

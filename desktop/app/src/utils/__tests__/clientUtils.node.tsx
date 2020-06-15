/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {deconstructClientId, buildClientId} from '../clientUtils';

test('client id constructed correctly', () => {
  const consoleErrorSpy = jest.spyOn(global.console, 'error');
  const clientId = buildClientId({
    app: 'Instagram',
    os: 'iOS',
    device: 'iPhone Simulator',
    device_id: 'EC431B79-69F1-4705-9FE5-9AE5D96378E1',
  });
  expect(clientId).toBe(
    'Instagram#iOS#iPhone Simulator#EC431B79-69F1-4705-9FE5-9AE5D96378E1',
  );
  expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
});

test('client id deconstructed correctly', () => {
  const deconstructedClientId = deconstructClientId(
    'Instagram#iOS#iPhone Simulator#EC431B79-69F1-4705-9FE5-9AE5D96378E1',
  );
  expect(deconstructedClientId).toStrictEqual({
    app: 'Instagram',
    os: 'iOS',
    device: 'iPhone Simulator',
    device_id: 'EC431B79-69F1-4705-9FE5-9AE5D96378E1',
  });
});

test('client id deconstruction error logged', () => {
  const consoleErrorSpy = jest.spyOn(global.console, 'error');
  const deconstructedClientId = deconstructClientId(
    'Instagram#iPhone Simulator#EC431B79-69F1-4705-9FE5-9AE5D96378E1',
  );
  expect(deconstructedClientId).toStrictEqual({
    app: 'Instagram',
    os: 'iPhone Simulator',
    device: 'EC431B79-69F1-4705-9FE5-9AE5D96378E1',
    device_id: undefined,
  });
  expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
});

test('special characters in app name handled correctly', () => {
  const consoleErrorSpy = jest.spyOn(global.console, 'error');

  const testClient = {
    app: '#myGreat#App&',
    os: 'iOS',
    device: 'iPhone Simulator',
    device_id: 'EC431B79-69F1-4705-9FE5-9AE5D96378E1',
  };
  const clientId = buildClientId(testClient);

  const deconstructedClientId = deconstructClientId(clientId);

  expect(deconstructedClientId).toStrictEqual(testClient);

  expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
});

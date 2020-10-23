/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {TestUtils} from 'flipper-plugin';
import * as plugin from '..';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(() => resolve(), ms));
}

// this testing is inspired by Flipper sample app
test('general plugin logic testing', async () => {
  const {instance, onSend, connect, sendEvent} = TestUtils.startPlugin(plugin, {
    startUnactivated: true,
  });
  onSend.mockImplementation(async (method, params) => {
    switch (method) {
      case 'getAllSharedPreferences':
        return {
          sample: {Hello: 'world'},
          other_sample: {SomeKey: 1337},
        };
      case 'setSharedPreference': {
        const p = params as plugin.SetSharedPreferenceParams;
        return {[p.preferenceName]: p.preferenceValue};
      }
      case 'deleteSharedPreference': {
        return {};
      }
    }
  });

  // Retrieve some data when connect
  connect();
  await sleep(1000);
  expect(onSend).toBeCalledWith('getAllSharedPreferences', {});
  expect(instance.sharedPreferences.get()).toMatchInlineSnapshot(`
    Object {
      "other_sample": Object {
        "changesList": Array [],
        "preferences": Object {
          "SomeKey": 1337,
        },
      },
      "sample": Object {
        "changesList": Array [],
        "preferences": Object {
          "Hello": "world",
        },
      },
    }
  `);
  expect(instance.selectedPreferences.get()).toEqual('sample');

  instance.setSelectedPreferences('other_sample');
  expect(instance.selectedPreferences.get()).toEqual('other_sample');

  // test changing preference
  const changedPref = {
    sharedPreferencesName: 'other_sample',
    preferenceName: 'SomeKey',
    preferenceValue: 5555,
  };
  await instance.setSharedPreference(changedPref);
  // this is sent from client after successful update
  sendEvent('sharedPreferencesChange', {
    deleted: false,
    name: 'SomeKey',
    preferences: 'sample',
    time: 1,
    value: 5555,
  });
  expect(onSend).toBeCalledWith('setSharedPreference', changedPref);
  expect(instance.sharedPreferences.get().sample.preferences.SomeKey).toEqual(
    5555,
  );
  expect(instance.sharedPreferences.get()).toMatchInlineSnapshot(`
    Object {
      "other_sample": Object {
        "changesList": Array [],
        "preferences": Object {
          "SomeKey": 5555,
        },
      },
      "sample": Object {
        "changesList": Array [
          Object {
            "deleted": false,
            "name": "SomeKey",
            "preferences": "sample",
            "time": 1,
            "value": 5555,
          },
        ],
        "preferences": Object {
          "Hello": "world",
          "SomeKey": 5555,
        },
      },
    }
  `);

  // test deleting preference
  const deletedPref = {
    sharedPreferencesName: 'other_sample',
    preferenceName: 'SomeKey',
  };
  await instance.deleteSharedPreference(deletedPref);
  // this is sent from client after successful update
  sendEvent('sharedPreferencesChange', {
    deleted: true,
    name: 'SomeKey',
    preferences: 'sample',
    time: 2,
  });
  expect(onSend).toBeCalledWith('deleteSharedPreference', deletedPref);
  expect(
    instance.sharedPreferences.get().sample.preferences.SomeKey,
  ).toBeUndefined();
  expect(instance.sharedPreferences.get()).toMatchInlineSnapshot(`
    Object {
      "other_sample": Object {
        "changesList": Array [],
        "preferences": Object {},
      },
      "sample": Object {
        "changesList": Array [
          Object {
            "deleted": true,
            "name": "SomeKey",
            "preferences": "sample",
            "time": 2,
          },
          Object {
            "deleted": false,
            "name": "SomeKey",
            "preferences": "sample",
            "time": 1,
            "value": 5555,
          },
        ],
        "preferences": Object {
          "Hello": "world",
        },
      },
    }
  `);
});

// TODO: Add unit test for UI

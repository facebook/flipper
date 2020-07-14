/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import * as Flipper from 'flipper';
// eslint-disable-next-line
import {act} from '@testing-library/react';

{
  // These mocks are needed because seammammals still uses Flipper in its UI implementation,
  // so we need to mock some things

  // @ts-ignore
  jest.spyOn(Flipper.DetailSidebar, 'type').mockImplementation((props) => {
    return <div className="DetailsSidebar">{props.children}</div>;
  });

  const origRequestIdleCallback = window.requestIdleCallback;
  const origCancelIdleCallback = window.cancelIdleCallback;
  // @ts-ignore
  window.requestIdleCallback = (fn: () => void) => {
    // the synchronous implementation forces DataInspector to render in sync
    act(fn);
  };
  // @ts-ignore
  window.cancelIdleCallback = clearImmediate;
  afterAll(() => {
    window.requestIdleCallback = origRequestIdleCallback;
    window.cancelIdleCallback = origCancelIdleCallback;
  });
}

import {TestUtils} from 'flipper-plugin';
import * as MammalsPlugin from '../';

test('It can store rows', () => {
  const {instance, ...plugin} = TestUtils.startPlugin(MammalsPlugin);

  expect(instance.rows.get()).toEqual({});
  expect(instance.selectedID.get()).toBeNull();

  plugin.sendEvent('newRow', {
    id: 1,
    title: 'Dolphin',
    url: 'http://dolphin.png',
  });
  plugin.sendEvent('newRow', {
    id: 2,
    title: 'Turtle',
    url: 'http://turtle.png',
  });

  expect(instance.rows.get()).toMatchInlineSnapshot(`
    Object {
      "1": Object {
        "id": 1,
        "title": "Dolphin",
        "url": "http://dolphin.png",
      },
      "2": Object {
        "id": 2,
        "title": "Turtle",
        "url": "http://turtle.png",
      },
    }
  `);
});

test('It can have selection and render details', async () => {
  const {instance, renderer, act, ...plugin} = TestUtils.renderPlugin(
    MammalsPlugin,
  );

  expect(instance.rows.get()).toEqual({});
  expect(instance.selectedID.get()).toBeNull();

  plugin.sendEvent('newRow', {
    id: 1,
    title: 'Dolphin',
    url: 'http://dolphin.png',
  });
  plugin.sendEvent('newRow', {
    id: 2,
    title: 'Turtle',
    url: 'http://turtle.png',
  });

  // Dolphin card should now be visible
  expect(await renderer.findByTestId('Dolphin')).not.toBeNull();
  // Let's assert the structure of the Turtle card as well
  expect(await renderer.findByTestId('Turtle')).toMatchInlineSnapshot(`
    <div
      class="css-ok7d66-View-FlexBox-FlexColumn"
      data-testid="Turtle"
    >
      <div
        class="css-vgz97s"
        style="background-image: url(http://turtle.png);"
      />
      <span
        class="css-b2jb3d-Text"
      >
        Turtle
      </span>
    </div>
  `);
  // Nothing selected, so we should not have a sidebar
  expect(renderer.queryAllByText('Extras').length).toBe(0);

  act(() => {
    instance.setSelection(2);
  });

  // Sidebar should be visible now
  expect(await renderer.findByText('Extras')).not.toBeNull();

  // Verify export
  expect(plugin.exportState()).toMatchInlineSnapshot(`
    Object {
      "rows": Object {
        "1": Object {
          "id": 1,
          "title": "Dolphin",
          "url": "http://dolphin.png",
        },
        "2": Object {
          "id": 2,
          "title": "Turtle",
          "url": "http://turtle.png",
        },
      },
      "selection": "2",
    }
  `);
});

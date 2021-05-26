/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {render, fireEvent} from '@testing-library/react';
import {TestUtils} from '../../';
import {sleep} from '../../utils/sleep';
import React, {Component} from 'react';
import {
  setGlobalInteractionReporter,
  resetGlobalInteractionReporter,
  InteractionReport,
  Tracked,
  wrapInteractionHandler,
  describeElement,
  TrackingScope,
  withTrackingScope,
} from '../Tracked';

let events: InteractionReport[] = [];

beforeEach(() => {
  events = [];
  setGlobalInteractionReporter((e) => {
    e.duration = 0; // avoid test unstability
    e.totalDuration = 0;
    events.push(e);
  });
});

afterEach(() => {
  resetGlobalInteractionReporter();
});

test('Tracked button', () => {
  const rendering = render(
    <Tracked>
      <button data-testid="test" onClick={() => {}}></button>
    </Tracked>,
  );

  fireEvent.click(rendering.getByTestId('test'));
  expect(events[0]).toEqual({
    action: `<button   data-testid=\"test\"   onClick={function noRefCheck() {}} />`,
    componentType: 'button',
    duration: 0,
    totalDuration: 0,
    error: undefined,
    event: 'onClick',
    scope: 'Flipper',
    success: 1,
    uuid: '00000000-0000-0000-0000-000000000000',
  });
});

test('Tracked button - custom handler', () => {
  const rendering = render(
    <Tracked events={['onDoubleClick']}>
      <button data-testid="test" onDoubleClick={() => {}}></button>
    </Tracked>,
  );

  fireEvent.doubleClick(rendering.getByTestId('test'));
  expect(events[0]).toEqual({
    action: `<button   data-testid=\"test\"   onDoubleClick={function noRefCheck() {}} />`,
    componentType: 'button',
    duration: 0,
    totalDuration: 0,
    error: undefined,
    event: 'onDoubleClick',
    scope: 'Flipper',
    success: 1,
    uuid: '00000000-0000-0000-0000-000000000000',
  });
});

test('Throwing action', () => {
  const fn = wrapInteractionHandler(
    () => {
      throw new Error('Oops');
    },
    <button />,
    'click',
    'test',
  );

  expect(() => {
    fn();
  }).toThrow('Oops');
  expect(events[0]).toEqual({
    action: `<button />`,
    componentType: 'button',
    duration: 0,
    totalDuration: 0,
    error: 'Error: Oops',
    event: 'click',
    scope: 'test',
    success: 0,
    uuid: '00000000-0000-0000-0000-000000000000',
  });
});

test('Async action', async () => {
  const fn = wrapInteractionHandler(
    async () => {
      Promise.resolve(3);
    },
    <button />,
    'click',
    'test',
  );

  const res = fn();
  expect(typeof fn).toBe('function');
  await res;
  expect(events[0]).toEqual({
    action: `<button />`,
    componentType: 'button',
    duration: 0,
    totalDuration: 0,
    error: undefined,
    event: 'click',
    scope: 'test',
    success: 1,
    uuid: '00000000-0000-0000-0000-000000000000',
  });
});

test('Throwing async action', async () => {
  const fn = wrapInteractionHandler(
    async () => {
      throw new Error('Oops');
    },
    <button />,
    'click',
    'test',
  );

  const res = fn();
  expect(typeof fn).toBe('function');
  let error = undefined;
  try {
    await res;
  } catch (e) {
    error = e;
  }
  expect('' + error).toBe(`Error: Oops`);
  expect(events[0]).toEqual({
    action: `<button />`,
    componentType: 'button',
    duration: 0,
    totalDuration: 0,
    error: `Error: Oops`,
    event: 'click',
    scope: 'test',
    success: 0,
    uuid: '00000000-0000-0000-0000-000000000000',
  });
});

test('timing', async () => {
  let data: InteractionReport | undefined = undefined;
  setGlobalInteractionReporter((e) => {
    data = e;
  });

  const fn = wrapInteractionHandler(
    async () => {
      const start = Date.now();
      while (Date.now() - start < 500) {
        //  nothing
      }
      await sleep(1000);
    },
    <button />,
    'click',
    'test',
  );
  await fn();
  expect(data!.duration > 100).toBe(true);
  expect(data!.duration < 1000).toBe(true);
  expect(data!.totalDuration > 800).toBe(true);
  expect(data!.totalDuration < 2000).toBe(true);
});

test('describeElement', () => {
  // String only child
  expect(describeElement(<button>Hi!</button>)).toBe('Hi!');
  // title
  expect(
    describeElement(
      <button key="a" title="b">
        Hi!
      </button>,
    ),
  ).toBe('b');
  // key + text
  expect(describeElement(<button key="a">Hi!</button>)).toBe('Hi!');
  // Rich JSX
  expect(
    describeElement(
      <button>
        <h1>Something complex</h1>Hi!
      </button>,
    ),
  ).toBe('<button>   <h1>     Something complex   </h1>   Hi! </button>');
  // Rich JSX with key
  expect(
    describeElement(
      <button key="test">
        <h1>Something complex</h1>Hi!
      </button>,
    ),
  ).toBe('test');
});

test('Scoped Tracked button', () => {
  const rendering = render(
    <TrackingScope scope="outer">
      <TrackingScope scope="inner">
        <Tracked>
          <button data-testid="test" onClick={() => {}}></button>
        </Tracked>
      </TrackingScope>
    </TrackingScope>,
  );

  fireEvent.click(rendering.getByTestId('test'));
  expect(events[0].scope).toEqual('outer:inner');
});

test('Scoped Tracked button in plugin', () => {
  const res = TestUtils.renderPlugin({
    plugin() {
      return {};
    },
    Component() {
      return (
        <TrackingScope scope="outer">
          <TrackingScope scope="inner">
            <Tracked>
              <button data-testid="test" onClick={() => {}}></button>
            </Tracked>
          </TrackingScope>
        </TrackingScope>
      );
    },
  });

  fireEvent.click(res.renderer.getByTestId('test'));
  expect(events[0].scope).toEqual('plugin:TestPlugin:outer:inner');
});

test('withScope - fn', () => {
  const MyCoolComponent = withTrackingScope(function MyCoolComponent() {
    return (
      <Tracked>
        <button data-testid="test" onClick={() => {}}></button>
      </Tracked>
    );
  });

  const res = TestUtils.renderPlugin({
    plugin() {
      return {};
    },
    Component() {
      return <MyCoolComponent />;
    },
  });

  fireEvent.click(res.renderer.getByTestId('test'));
  expect(events[0].scope).toEqual('plugin:TestPlugin:MyCoolComponent');
});

test('withScope - class', () => {
  const MyCoolComponent = withTrackingScope(
    class MyCoolComponent extends Component {
      render() {
        return (
          <Tracked>
            <button data-testid="test" onClick={() => {}}></button>
          </Tracked>
        );
      }
    },
  );

  const res = TestUtils.renderPlugin({
    plugin() {
      return {};
    },
    Component() {
      return <MyCoolComponent />;
    },
  });

  fireEvent.click(res.renderer.getByTestId('test'));
  expect(events[0].scope).toEqual('plugin:TestPlugin:MyCoolComponent');
});

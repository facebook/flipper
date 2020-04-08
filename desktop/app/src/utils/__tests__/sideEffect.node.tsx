/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {sideEffect} from '../sideEffect';
import {createStore, Store} from 'redux';
import produce from 'immer';
import {sleep} from '../promiseTimeout';

const initialState = {
  counter: {count: 0},
  somethingUnrelated: false,
};

type State = typeof initialState;
type Action = {type: 'inc'} | {type: 'unrelated'};

function reducer(state: State, action: Action): State {
  return produce(state, (draft) => {
    if (action.type === 'inc') {
      draft.counter.count++;
    }
    if (action.type === 'unrelated') {
      draft.somethingUnrelated = !draft.somethingUnrelated;
    }
  });
}

describe('sideeffect', () => {
  let store: Store<State, Action>;
  let events: string[];
  let unsubscribe: undefined | (() => void) = undefined;
  let warn: jest.Mock;
  let error: jest.Mock;
  const origWarning = console.warn;
  const origError = console.error;

  beforeEach(() => {
    // @ts-ignore
    store = createStore(reducer, initialState);
    events = [];
    warn = console.warn = jest.fn();
    error = console.error = jest.fn();
  });

  afterEach(() => {
    unsubscribe?.();
  });

  afterEach(() => {
    console.warn = origWarning;
    console.error = origError;
  });

  test('can run a basic effect', async () => {
    unsubscribe = sideEffect(
      store,
      {name: 'test', throttleMs: 1},
      (s) => s,
      (s, passedStore) => {
        expect(passedStore).toBe(store);
        events.push(`counter: ${s.counter.count}`);
      },
    );

    store.dispatch({type: 'inc'});
    store.dispatch({type: 'inc'});
    expect(events.length).toBe(0);

    // arrive as a single effect
    await sleep(10);
    expect(events).toEqual(['counter: 2']);

    // no more events arrive after unsubscribe
    unsubscribe();
    store.dispatch({type: 'inc'});
    await sleep(10);
    expect(events).toEqual(['counter: 2']);
    expect(warn).not.toBeCalled();
    expect(error).not.toBeCalled();
  });

  test('respects selector', async () => {
    unsubscribe = sideEffect(
      store,
      {name: 'test', throttleMs: 1},
      (s) => s.counter.count,
      (count) => {
        events.push(`counter: ${count}`);
      },
    );

    store.dispatch({type: 'unrelated'});
    expect(events.length).toBe(0);

    // unrelated event doesn't trigger
    await sleep(10);
    expect(events.length).toBe(0);

    // counter increment does
    store.dispatch({type: 'inc'});

    await sleep(10);
    expect(events).toEqual(['counter: 1']);
    expect(warn).not.toBeCalled();
    expect(error).not.toBeCalled();
  });

  test('respects shallow equal selector', async () => {
    unsubscribe = sideEffect(
      store,
      {name: 'test', throttleMs: 1},
      (s) => ({number: s.counter.count}),
      ({number}) => {
        events.push(`counter: ${number}`);
      },
    );

    store.dispatch({type: 'unrelated'});
    expect(events.length).toBe(0);

    // unrelated event doesn't trigger
    await sleep(10);
    expect(events.length).toBe(0);

    // counter increment does
    store.dispatch({type: 'inc'});

    await sleep(10);
    expect(events).toEqual(['counter: 1']);
    expect(warn).not.toBeCalled();
    expect(error).not.toBeCalled();
  });

  test('handles errors', async () => {
    unsubscribe = sideEffect(
      store,
      {name: 'test', throttleMs: 1},
      (s) => s,
      () => {
        throw new Error('oops');
      },
    );

    expect(() => {
      store.dispatch({type: 'inc'});
    }).not.toThrow();

    await sleep(10);
    expect(error.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "Error while running side effect 'test': Error: oops",
          [Error: oops],
        ],
      ]
    `);
  });

  test('warns about long running effects', async () => {
    let done = false;
    unsubscribe = sideEffect(
      store,
      {name: 'test', throttleMs: 10},
      (s) => s,
      () => {
        const end = Date.now() + 100;
        while (Date.now() < end) {
          // block
        }
        done = true;
      },
    );

    store.dispatch({type: 'inc'});
    await sleep(200);
    expect(done).toBe(true);
    expect(warn.mock.calls[0][0]).toContain("Side effect 'test' took");
  });

  test('throttles correctly', async () => {
    unsubscribe = sideEffect(
      store,
      {name: 'test', throttleMs: 1000},
      (s) => s.counter.count,
      (number) => {
        events.push(`counter: ${number}`);
      },
    );

    // Fires immediately
    store.dispatch({type: 'inc'});
    await sleep(100);
    expect(events).toEqual(['counter: 1']);

    // no new tick in the next 100 ms
    await sleep(300);
    store.dispatch({type: 'inc'});

    await sleep(300);
    store.dispatch({type: 'inc'});

    expect(events).toEqual(['counter: 1']);
    await sleep(1000);
    expect(events).toEqual(['counter: 1', 'counter: 3']);

    // long time now effect, it will fire right away again
    await sleep(2000);

    // ..but firing an event that doesn't match the selector doesn't reset the timer
    store.dispatch({type: 'unrelated'});
    await sleep(100);

    store.dispatch({type: 'inc'});
    store.dispatch({type: 'inc'});
    await sleep(100);
    expect(events).toEqual(['counter: 1', 'counter: 3', 'counter: 5']);
  });
});

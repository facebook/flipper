/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createState} from '../atom';

test('can subscribe to atom state changes', () => {
  const state = createState('abc');
  let receivedValue: string | undefined;
  let receivedPrevValue: string | undefined;
  const unsubscribe = state.subscribe((value, prevValue) => {
    receivedValue = value;
    receivedPrevValue = prevValue;
  });
  try {
    state.set('def');
    expect(receivedValue).toBe('def');
    expect(receivedPrevValue).toBe('abc');
    state.set('ghi');
    expect(receivedValue).toBe('ghi');
    expect(receivedPrevValue).toBe('def');
  } finally {
    unsubscribe();
  }
});

test('can unsubscribe from atom state changes', () => {
  const state = createState('abc');
  let receivedValue: string | undefined;
  let receivedPrevValue: string | undefined;
  const unsubscribe = state.subscribe((value, prevValue) => {
    receivedValue = value;
    receivedPrevValue = prevValue;
  });
  try {
    state.set('def');
    expect(receivedValue).toBe('def');
    expect(receivedPrevValue).toBe('abc');
  } finally {
    unsubscribe();
  }
  state.set('ghi');
  expect(receivedValue).toBe('def');
  expect(receivedPrevValue).toBe('abc');
});

test('can unsubscribe from atom state changes using unsubscribe method', () => {
  const state = createState('abc');
  let receivedValue: string | undefined;
  let receivedPrevValue: string | undefined;
  const listener = (value: string, prevValue: string) => {
    receivedValue = value;
    receivedPrevValue = prevValue;
  };
  state.subscribe(listener);
  try {
    state.set('def');
    expect(receivedValue).toBe('def');
    expect(receivedPrevValue).toBe('abc');
  } finally {
    state.unsubscribe(listener);
  }
  state.set('ghi');
  expect(receivedValue).toBe('def');
  expect(receivedPrevValue).toBe('abc');
});

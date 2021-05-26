/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {render, fireEvent, act} from '@testing-library/react';

import {useLocalStorageState} from '../../utils/useLocalStorageState';

function TestComponent({
  storageKey,
  value,
}: {
  storageKey: string;
  value: number;
}) {
  const [current, setCurrent] = useLocalStorageState(storageKey, value);

  return (
    <div>
      <div data-testid="value">{current}</div>
      <button
        data-testid="inc"
        onClick={() => {
          setCurrent((c) => c + 1);
        }}></button>
    </div>
  );
}

let getSpy: jest.SpyInstance;
let setSpy: jest.SpyInstance;
let storage: Record<string, any> = {};

beforeEach(() => {
  storage = {};
  getSpy = jest
    .spyOn(Storage.prototype, 'getItem') // https://github.com/facebook/jest/issues/6798#issuecomment-412871616
    .mockImplementation((key: string) => {
      return storage[key];
    });
  setSpy = jest
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation((key: string, value: any) => {
      storage[key] = value;
    });
});

afterEach(() => {
  getSpy.mockRestore();
  setSpy.mockRestore();
});

test('it can store values', async () => {
  const res = render(<TestComponent storageKey="x" value={1} />);
  expect((await res.findByTestId('value')).textContent).toEqual('1');

  await act(async () => {
    fireEvent.click(await res.findByTestId('inc'));
  });

  expect((await res.findByTestId('value')).textContent).toEqual('2');
  expect(storage).toMatchInlineSnapshot(`
    Object {
      "[useLocalStorage][Flipper]x": "2",
    }
  `);
});

test('it can read default from storage', async () => {
  storage['[useLocalStorage][Flipper]x'] = '3';
  const res = render(<TestComponent storageKey="x" value={1} />);
  expect((await res.findByTestId('value')).textContent).toEqual('3');

  await act(async () => {
    fireEvent.click(await res.findByTestId('inc'));
  });

  expect((await res.findByTestId('value')).textContent).toEqual('4');
  expect(storage).toMatchInlineSnapshot(`
    Object {
      "[useLocalStorage][Flipper]x": "4",
    }
  `);
});

test('it does not allow changing key', async () => {
  const res = render(<TestComponent storageKey="x" value={1} />);

  expect(() => {
    const orig = console.error;
    try {
      // supress error in console
      console.error = jest.fn();
      res.rerender(<TestComponent storageKey="y" value={1} />);
    } finally {
      console.error = orig;
    }
  }).toThrowErrorMatchingInlineSnapshot(
    `"[useAssertStableRef] An unstable reference was passed to this component as property 'key'. For optimization purposes we expect that this prop doesn't change over time. You might want to create the value passed to this prop outside the render closure, store it in useCallback / useMemo / useState, or set a key on the parent component"`,
  );
});

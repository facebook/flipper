/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react';

jest.mock('../../../../fb/Logger');
import ManagedDataInspector from '../ManagedDataInspector';

const mocks = {
  requestIdleCallback(fn: Function) {
    return setTimeout(fn, 1);
  },
  cancelIdleCallback(handle: any) {
    clearTimeout(handle);
  },
};

beforeAll(() => {
  Object.keys(mocks).forEach((key) => {
    // @ts-ignore
    if (!global[key]) {
      // @ts-ignore
      global[key] = mocks[key];
    }
  });
});

afterAll(() => {
  Object.keys(mocks).forEach((key) => {
    // @ts-ignore
    if (global[key] === mocks[key]) {
      // @ts-ignore
      delete global[key];
    }
  });
});

const json = {
  data: {
    is: {
      awesomely: 'cool',
    },
    and: {
      also: 'json',
    },
  },
};

test('changing collapsed property works', async () => {
  const res = render(<ManagedDataInspector data={json} collapsed expandRoot />);
  expect(await res.findByText(/is/)).toBeTruthy(); // from expandRoot
  expect((await res.queryAllByText(/cool/)).length).toBe(0);

  res.rerender(
    <ManagedDataInspector data={json} collapsed={false} expandRoot />,
  );
  await waitFor(() => res.findByText(/cool/));

  res.rerender(
    <ManagedDataInspector data={json} collapsed={true} expandRoot />,
  );
  expect((await res.queryAllByText(/cool/)).length).toBe(0);
});

test('can manually collapse properties', async () => {
  const res = render(<ManagedDataInspector data={json} collapsed expandRoot />);

  await res.findByText(/is/); // previewed as key, like: "data: {is, and}"
  expect((await res.queryAllByText(/awesomely/)).length).toBe(0);

  // expand twice
  fireEvent.click(await res.findByText(/data/));
  await res.findByText(/awesomely/);
  expect((await res.queryAllByText(/cool/)).length).toBe(0);

  fireEvent.click(await res.findByText(/is/));
  await res.findByText(/cool/);
  expect((await res.queryAllByText(/json/)).length).toBe(0); // this node is not shown

  // collapsing everything again
  fireEvent.click(await res.findByText(/data/));
  await waitFor(() => {
    expect(res.queryByText(/awesomely/)).toBeNull();
  });

  // expand everything again, expanded paths will have been remembered
  fireEvent.click(await res.findByText(/data/));
  await res.findByText(/is/);
  await res.findByText(/awesomely/);
  await waitFor(() => {
    expect(res.queryByText(/json/)).toBeNull();
  });
});

test('can filter for data', async () => {
  const res = render(
    <ManagedDataInspector data={json} collapsed={false} expandRoot />,
  );
  await res.findByText(/awesomely/); // everything is shown

  res.rerender(
    <ManagedDataInspector
      data={json}
      collapsed={false}
      expandRoot
      filter="sOn"
    />,
  );
  const element = await res.findByText(/son/); // N.B. search for 'son', as the text was split up
  // snapshot to make sure the hilighiting did it's job
  expect(element.parentElement).toMatchInlineSnapshot(`
    <span>
      "j
      <span
        class="css-1tdfls1"
      >
        son
      </span>
      "
    </span>
  `);
  // hides the other part of the tree
  await waitFor(() => {
    expect(res.queryByText(/cool/)).toBeNull();
  });

  // find by key
  res.rerender(
    <ManagedDataInspector
      data={json}
      collapsed={false}
      expandRoot
      filter="somel"
    />,
  );
  await res.findByText(/cool/);
  // hides the other part of the tree
  await waitFor(() => {
    expect(res.queryByText(/json/)).toBeNull();
  });

  res.rerender(
    <ManagedDataInspector data={json} collapsed={false} expandRoot filter="" />,
  );
  // everything visible again
  await res.findByText(/awesomely/);
  await res.findByText(/json/);
});

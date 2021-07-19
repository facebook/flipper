/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {render, fireEvent, waitFor, act} from '@testing-library/react';

import {DataInspector} from '../DataInspector';
import {sleep} from '../../../utils/sleep';

const json = {
  data: {
    is: {
      awesomely: 'cool cool cool cool cool cool cool', // long enough to prevent quick preview
    },
    and: {
      also: {
        deeper: 'json',
      },
    },
  },
};

test('changing collapsed property works', async () => {
  const res = render(<DataInspector data={json} collapsed expandRoot />);
  expect(await res.findByText(/is/)).toBeTruthy(); // from expandRoot
  expect(res.queryAllByText(/cool/).length).toBe(0);

  res.rerender(<DataInspector data={json} collapsed={false} expandRoot />);
  await res.findByText(/cool/);

  res.rerender(<DataInspector data={json} collapsed expandRoot />);
  expect(res.queryAllByText(/cool/).length).toBe(0);
});

test('can manually collapse properties', async () => {
  const res = render(<DataInspector data={json} collapsed expandRoot />);

  await res.findByText(/is/); // previewed as key, like: "data: {is, and}"
  expect(res.queryAllByText(/awesomely/).length).toBe(0);

  // expand twice
  fireEvent.click(await res.findByText(/data/));
  await res.findByText(/awesomely/);
  expect(res.queryAllByText(/cool/).length).toBe(0);
  expect(res.queryAllByText(/also/).length).toBe(1); // key shown as preview
  expect(res.queryAllByText(/deeper/).length).toBe(0);

  fireEvent.click(await res.findByText(/is/));
  await res.findByText(/cool/);

  expect(res.queryAllByText(/json/).length).toBe(0); // this is shown thanks to quick preview

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

// TODO(T95985157): Flaky in open source.
test.skip('can filter for data', async () => {
  const res = render(
    <DataInspector data={json} collapsed={false} expandRoot />,
  );
  await res.findByText(/awesomely/); // everything is shown

  // act here is used to make sure the highlight changes have propagated
  await act(async () => {
    res.rerender(
      <DataInspector data={json} collapsed={false} expandRoot filter="sOn" />,
    );
    await sleep(200);
  });

  const element = await res.findByText(/son/); // N.B. search for 'son', as the text was split up
  // snapshot to make sure the hilighiting did it's job
  expect(element.parentElement).toMatchInlineSnapshot(`
    <span>
      "j
      <span
        class="css-1cfwmd7-Highlighted eiud9hg0"
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
  await act(async () => {
    res.rerender(
      <DataInspector data={json} collapsed={false} expandRoot filter="somel" />,
    );
    await sleep(200);
  });

  await res.findByText(/cool/);
  // hides the other part of the tree
  await waitFor(() => {
    expect(res.queryByText(/json/)).toBeNull();
  });

  await act(async () => {
    res.rerender(
      <DataInspector data={json} collapsed={false} expandRoot filter="" />,
    );
    await sleep(200);
  });

  // everything visible again
  await res.findByText(/awesomely/);
  await res.findByText(/json/);
});

test('can render recursive data for data', async () => {
  const json = {
    a: {
      recursive: undefined as any,
    },
  };
  json.a.recursive = json;

  const res = render(
    <DataInspector data={json} collapsed={false} expandRoot />,
  );
  await res.findByText(/Recursive/);
});

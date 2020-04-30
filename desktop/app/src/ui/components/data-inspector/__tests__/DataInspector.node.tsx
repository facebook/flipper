/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {render, fireEvent} from '@testing-library/react';

jest.mock('../../../../fb/Logger');
import ManagedDataInspector from '../ManagedDataInspector';

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
  expect((await res.queryAllByText(/is/)).length).toBe(1); // from expandRoot
  expect((await res.queryAllByText(/cool/)).length).toBe(0);

  res.rerender(
    <ManagedDataInspector data={json} collapsed={false} expandRoot />,
  );
  expect((await res.queryAllByText(/cool/)).length).toBe(1);

  res.rerender(
    <ManagedDataInspector data={json} collapsed={true} expandRoot />,
  );
  expect((await res.queryAllByText(/cool/)).length).toBe(0);
});

test('can manually collapse properties', async () => {
  const res = render(<ManagedDataInspector data={json} collapsed expandRoot />);
  expect((await res.queryAllByText(/awesomely/)).length).toBe(0);
  expect((await res.queryAllByText(/is/)).length).toBe(1); // previewed as key, like: "data: {is, and}"

  // expand twice
  fireEvent.click(await res.findByText(/data/));
  expect((await res.queryAllByText(/awesomely/)).length).toBe(1);
  expect((await res.queryAllByText(/cool/)).length).toBe(0);
  fireEvent.click(await res.findByText(/is/));
  expect((await res.queryAllByText(/cool/)).length).toBe(1);
  expect((await res.queryAllByText(/json/)).length).toBe(0); // this node is not shown

  // collapsing everything again
  fireEvent.click(await res.findByText(/data/));
  expect((await res.queryAllByText(/awesomely/)).length).toBe(0);

  // expand everything again, expanded paths will have been remembered
  fireEvent.click(await res.findByText(/data/));
  expect((await res.queryAllByText(/is/)).length).toBe(1);
  expect((await res.queryAllByText(/awesomely/)).length).toBe(1);
  expect((await res.queryAllByText(/json/)).length).toBe(0);
});

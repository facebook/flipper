/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {render, fireEvent, waitFor, act} from '@testing-library/react';

import {DataInspector} from '../DataInspector';
import {sleep} from 'flipper-common';
import {Menu} from 'antd';

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

test('additional context menu items are rendered', async () => {
  const res = render(
    <DataInspector
      data={json}
      expandRoot
      additionalContextMenuItems={(parentPath, value, name) => {
        const path = [...parentPath, name].join('->');
        return [<Menu.Item key="test">path={path}</Menu.Item>];
      }}
    />,
  );

  expect(await res.queryByText('path=data')).toBeFalsy;
  const dataContainer = await res.findByText(/data/);
  fireEvent.mouseEnter(dataContainer, {});
  fireEvent.contextMenu(dataContainer, {});

  const contextItem = await res.findByText('path=data');
  expect(contextItem).toBeTruthy;
  fireEvent.click(contextItem);
  expect(await res.queryByText('path=data')).toBeFalsy;
  fireEvent.mouseLeave(dataContainer, {});

  //try on a nested element
  const awesomely = await res.findByText(/awesomely/);
  fireEvent.mouseEnter(awesomely, {});
  fireEvent.contextMenu(awesomely, {});
  expect(await res.findByText('path=data->is->awesomely')).toBeTruthy;
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

test.local('can filter for data', async () => {
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
      <span>
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

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {render, fireEvent} from '@testing-library/react';

import ToolbarIcon from '../ToolbarIcon';
import TooltipProvider from '../TooltipProvider';

const TITLE_STRING = 'This is for testing';

test('rendering element icon without hovering', () => {
  const res = render(
    <ToolbarIcon title={TITLE_STRING} icon="target" onClick={() => {}} />,
  );
  expect(res.queryAllByText(TITLE_STRING).length).toBe(0);
});

test('trigger active for coverage(?)', () => {
  const res = render(
    <ToolbarIcon title={TITLE_STRING} icon="target" onClick={() => {}} />,
  );
  res.rerender(
    <ToolbarIcon
      active
      title={TITLE_STRING}
      icon="target"
      onClick={() => {}}
    />,
  );
  res.rerender(
    <ToolbarIcon title={TITLE_STRING} icon="target" onClick={() => {}} />,
  );
});

test('test on hover and unhover', () => {
  const res = render(
    <TooltipProvider>
      <ToolbarIcon title={TITLE_STRING} icon="target" onClick={() => {}} />
    </TooltipProvider>,
  );
  expect(res.queryAllByText(TITLE_STRING).length).toBe(0);

  const comp = res.container.firstChild?.childNodes[0];
  expect(comp).not.toBeNull();

  // hover
  fireEvent.mouseEnter(comp!);
  expect(res.queryAllByText(TITLE_STRING).length).toBe(1);
  // unhover
  fireEvent.mouseLeave(comp!);
  expect(res.queryAllByText(TITLE_STRING).length).toBe(0);
});

test('test on click', () => {
  const mockOnClick = jest.fn(() => {});
  const res = render(
    <TooltipProvider>
      <ToolbarIcon title={TITLE_STRING} icon="target" onClick={mockOnClick} />
    </TooltipProvider>,
  );
  const comp = res.container.firstChild?.childNodes[0];
  expect(comp).not.toBeNull();

  // click
  fireEvent.click(comp!);
  expect(mockOnClick.mock.calls.length).toBe(1);
});

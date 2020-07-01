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

import {Element} from 'flipper';
import MultipleSelectorSection from '../MultipleSelectionSection';

const TITLE_STRING = 'Multiple elements found at the target coordinates';
const dummyElmentData: Omit<Element, 'id' | 'name'> = {
  expanded: false,
  children: [],
  attributes: [],
  data: {},
  decoration: '',
  extraInfo: {},
};

test('rendering a single element', () => {
  const id = 'id1';
  const name = 'id_name';
  const element: Element = {...dummyElmentData, id, name};
  const res = render(
    <MultipleSelectorSection
      initialSelectedElement={null}
      elements={{[id]: element}}
      onElementSelected={() => {}}
      onElementHovered={null}
    />,
  );

  expect(res.queryByText(TITLE_STRING)).toBeDefined();
  expect(res.queryAllByText(name).length).toBe(1);
});

test('collapsing an element', () => {
  const id = 'id1';
  const name = 'id_name';
  const element: Element = {...dummyElmentData, id, name};
  const res = render(
    <MultipleSelectorSection
      initialSelectedElement={null}
      elements={{[id]: element}}
      onElementSelected={() => {}}
      onElementHovered={null}
    />,
  );

  expect(res.queryAllByText(name).length).toBe(1);

  // collapse the view
  fireEvent.click(res.getByText(TITLE_STRING));
  expect(res.queryAllByText(name).length).toBe(0);

  // re-expand the view
  fireEvent.click(res.getByText(TITLE_STRING));
  expect(res.queryAllByText(name).length).toBe(1);
});

test('clicking on elements', () => {
  const ids = ['id1', 'id2', 'id3'];
  const names = ['id_name_first', 'id_name_second', 'id_name_third'];
  const elements: {[id: string]: Element} = ids.reduce(
    (acc: {[id: string]: Element}, id, idx) => {
      acc[id] = {...dummyElmentData, id, name: names[idx]};
      return acc;
    },
    {},
  );
  const mockOnElementSelected = jest.fn((_key: string) => {});
  window.scrollTo = () => {};
  const res = render(
    <MultipleSelectorSection
      initialSelectedElement={null}
      elements={elements}
      onElementSelected={mockOnElementSelected}
      onElementHovered={null}
    />,
  );

  const clickingIdx = [0, 1, 2, 1, 0];
  clickingIdx.forEach((idx) => fireEvent.click(res.getByText(names[idx])));

  // expect all click to call the function
  expect(mockOnElementSelected.mock.calls.length).toBe(clickingIdx.length);
  clickingIdx.forEach((valIdx, idx) =>
    expect(mockOnElementSelected.mock.calls[idx][0]).toBe(ids[valIdx]),
  );
});

test('hovering on elements', () => {
  const ids = ['id1', 'id2', 'id3'];
  const names = ['id_name_first', 'id_name_second', 'id_name_third'];
  const elements: {[id: string]: Element} = ids.reduce(
    (acc: {[id: string]: Element}, id, idx) => {
      acc[id] = {...dummyElmentData, id, name: names[idx]};
      return acc;
    },
    {},
  );
  const mockOnElementSelected = jest.fn((_key: string) => {});
  const mockOnElementHovered = jest.fn((_key: string | null | undefined) => {});
  window.scrollTo = () => {};
  const res = render(
    <MultipleSelectorSection
      initialSelectedElement={null}
      elements={elements}
      onElementSelected={mockOnElementSelected}
      onElementHovered={mockOnElementHovered}
    />,
  );

  const clickingIdx = [0, 1, 2, 1, 0];
  clickingIdx.forEach((idx) => fireEvent.mouseOver(res.getByText(names[idx])));

  // expect all hover to call the function
  expect(mockOnElementHovered.mock.calls.length).toBe(clickingIdx.length);
  clickingIdx.forEach((valIdx, idx) =>
    expect(mockOnElementHovered.mock.calls[idx][0]).toBe(ids[valIdx]),
  );

  // expect no click to be called
  expect(mockOnElementSelected.mock.calls.length).toBe(0);
});

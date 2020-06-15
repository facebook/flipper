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
import DropDownSearchView from '../DropDownSearchView';
import {act} from 'react-dom/test-utils';

test('Test selected element id is shown as the selected one.', async () => {
  const res = render(
    <DropDownSearchView
      list={[{id: 'id1', label: 'label1'}]}
      onSelect={jest.fn()}
      handleNoResults={jest.fn()}
      selectedElementID={'id1'}
    />,
  );
  const searchInput = (await res.findByTestId(
    'search-input',
  )) as HTMLInputElement;
  expect(searchInput).toBeTruthy();
  expect(searchInput.value).toEqual('label1');

  act(() => {
    searchInput.dispatchEvent(new FocusEvent('focus', {bubbles: true}));
  });
  expect(await res.queryByText('label1')).toBeTruthy();
});

test('Test the change of the selectedElementID changes the the selected element in the UI.', async () => {
  const res = render(
    <DropDownSearchView
      list={[
        {id: 'id1', label: 'label1'},
        {id: 'id2', label: 'label2'},
      ]}
      onSelect={jest.fn()}
      handleNoResults={jest.fn()}
      selectedElementID={'id1'}
    />,
  );
  const searchInput = (await res.findByTestId(
    'search-input',
  )) as HTMLInputElement;
  expect(searchInput).toBeTruthy();
  expect(searchInput.value).toEqual('label1');

  res.rerender(
    <DropDownSearchView
      list={[
        {id: 'id1', label: 'label1'},
        {id: 'id2', label: 'label2'},
      ]}
      onSelect={jest.fn()}
      handleNoResults={jest.fn()}
      selectedElementID={'id2'}
    />,
  );
  const searchInputRerendered = (await res.findByTestId(
    'search-input',
  )) as HTMLInputElement;
  expect(searchInputRerendered).toBeTruthy();
  expect(searchInputRerendered.value).toEqual('label2');
});

test('Test the entire flow and click on the available options.', async () => {
  const onSelect = jest.fn();
  const res = render(
    <DropDownSearchView
      list={[
        {id: 'id1', label: 'label1'},
        {id: 'id2', label: 'label2'},
        {id: 'id3', label: 'label3'},
        {id: 'id4', label: 'label4'},
      ]}
      onSelect={onSelect}
      handleNoResults={jest.fn()}
      selectedElementID={'id1'}
    />,
  );
  const searchInput = (await res.findByTestId(
    'search-input',
  )) as HTMLInputElement;
  expect(searchInput).toBeTruthy();
  expect(searchInput.value).toEqual('label1');

  act(() => {
    searchInput.dispatchEvent(new FocusEvent('focus', {bubbles: true}));
  });
  // Right now just the filtered elements will show up
  expect(await res.queryByText('label1')).toBeTruthy();
  expect(await res.queryByText('label2')).toBeFalsy();
  expect(await res.queryByText('label3')).toBeFalsy();
  expect(await res.queryByText('label4')).toBeFalsy();
  act(() => {
    fireEvent.change(searchInput, {target: {value: ''}});
  });
  // Once the input field is cleared all the available options will show up.
  expect(await res.queryByText('label1')).toBeTruthy();
  expect(await res.queryByText('label2')).toBeTruthy();
  expect(await res.queryByText('label3')).toBeTruthy();
  const text4 = await res.queryByText('label4');

  expect(text4).toBeTruthy();

  act(() => {
    text4?.parentElement?.dispatchEvent(
      new MouseEvent('click', {bubbles: true}),
    );
  });

  expect(searchInput.value).toEqual('label4');
  expect(onSelect).toBeCalledTimes(1);
  // After onSelect the expanded menu gets closed.
  expect(await res.queryByText('label1')).toBeFalsy();
  expect(await res.queryByText('label2')).toBeFalsy();
  expect(await res.queryByText('label3')).toBeFalsy();
  expect(await res.queryByText('label4')).toBeFalsy();
});

test('Test the validation error.', async () => {
  const handleNoResults = jest.fn();
  const res = render(
    <DropDownSearchView
      list={[
        {id: 'id1', label: 'label1 group'},
        {id: 'id2', label: 'label2 group'},
        {id: 'id3', label: 'label3 support'},
        {id: 'id4', label: 'label4 support'},
      ]}
      handleNoResults={handleNoResults}
      selectedElementID={undefined}
    />,
  );
  const searchInput = (await res.findByTestId(
    'search-input',
  )) as HTMLInputElement;
  expect(searchInput).toBeTruthy();
  expect(searchInput.value).toEqual('');

  act(() => {
    searchInput.dispatchEvent(new FocusEvent('focus', {bubbles: true}));
  });
  // Right now just the filtered elements will show up
  expect(await res.queryByText('label1 group')).toBeTruthy();
  expect(await res.queryByText('label2 group')).toBeTruthy();
  expect(await res.queryByText('label3 support')).toBeTruthy();
  expect(await res.queryByText('label4 support')).toBeTruthy();

  act(() => {
    fireEvent.change(searchInput, {target: {value: 'support'}});
  });
  // Only the items which satisfy the search query should be shown
  expect(await res.queryByText('label3 support')).toBeTruthy();
  expect(await res.queryByText('label4 support')).toBeTruthy();
  expect(await res.queryByText('label1 group')).toBeFalsy();
  expect(await res.queryByText('label2 group')).toBeFalsy();
  act(() => {
    fireEvent.change(searchInput, {target: {value: 'gibberish'}});
  });

  expect(handleNoResults).toBeCalled();
  expect(await res.queryByText('label3 support')).toBeFalsy();
  expect(await res.queryByText('label4 support')).toBeFalsy();
  expect(await res.queryByText('label1 group')).toBeFalsy();
  expect(await res.queryByText('label2 group')).toBeFalsy();
});

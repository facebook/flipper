/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import Inspector, {ElementSelectorNode} from '../Inspector';
import {PluginClient, Element} from 'flipper';
import React from 'react';
import {render} from '@testing-library/react';

let inspectorComponent: Inspector | null = null;
beforeEach(() => {
  const mockRoot: Element = {
    id: '10000',
    name: '10000',
    expanded: false,
    children: [],
    attributes: [],
    data: {},
    decoration: '',
    extraInfo: {},
  };
  const client: PluginClient = {
    send: () => {},
    call: () => Promise.resolve(mockRoot),
    subscribe: () => {},
    supportsMethod: () => Promise.resolve(false),
  };
  render(
    <Inspector
      client={client}
      showsSidebar={false}
      selectedElement={null}
      selectedAXElement={null}
      onSelect={() => {}}
      onDataValueChanged={() => {}}
      setPersistedState={() => {}}
      persistedState={{
        rootElement: null,
        rootAXElement: null,
        elements: {},
        AXelements: {},
      }}
      searchResults={null}
      ref={(e) => {
        inspectorComponent = e;
      }}
    />,
  );
});

function constructTestTree(): ElementSelectorNode {
  // The tree will be:
  // 10000 ---> 11000 ---> 11100 ---> 11110
  //       |           |          +-> 11120
  //       |           +-> 11200
  //       +--> 12000 ---> 12100
  //                   +-> 12200 ---> 12210 ---> 12211
  //                   +-> 12300 ---> 12310
  //                              +-> 12320
  return {
    10000: {
      11000: {11100: {11110: {}, 11120: {}}, 11200: {}},
      12000: {
        12100: {},
        12200: {12210: {12211: {}}},
        12300: {12310: {}, 12320: {}},
      },
    },
  };
}

test('test getPathFromNode without id', () => {
  const tree = constructTestTree();
  const path = inspectorComponent?.getPathForNode(tree, null);
  let subtree = tree;
  path?.forEach((id) => {
    subtree = subtree[id];
    expect(subtree).toBeDefined();
  });
  expect(subtree).toEqual({});
});

test('test getPathFromNode with id (leaf)', () => {
  const tree = constructTestTree();
  const path = inspectorComponent?.getPathForNode(tree, '12320');
  expect(path).toEqual(['10000', '12000', '12300', '12320']);
});

test('test getPathFromNode with id (non-leaf)', () => {
  const tree = constructTestTree();
  const path = inspectorComponent?.getPathForNode(tree, '12210');
  expect(path).toEqual(['10000', '12000', '12200', '12210']);
});

test('test getPathFromNode with non-existing id', () => {
  const tree = constructTestTree();
  const path = inspectorComponent?.getPathForNode(tree, '12313');
  expect(path).toBeNull();
});

test('test getElementLeaves', () => {
  const tree = constructTestTree();
  const leaves = inspectorComponent?.getElementLeaves(tree);
  expect(leaves).toHaveLength(7);
  expect(leaves).toEqual(
    expect.arrayContaining([
      '11110',
      '11120',
      '11200',
      '12100',
      '12211',
      '12310',
      '12320',
    ]),
  );
});

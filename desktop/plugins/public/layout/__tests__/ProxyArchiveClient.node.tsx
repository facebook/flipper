/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  default as ProxyArchiveClient,
  searchNodes,
} from '../ProxyArchiveClient';
import {PersistedState, ElementMap} from '../index';
import {ElementID, Element} from 'flipper';
import {SearchResultTree} from '../Search';

function constructElement(
  id: string,
  name: string,
  children: Array<ElementID>,
): Element {
  return {
    id,
    name,
    expanded: false,
    children,
    attributes: [],
    data: {},
    decoration: 'decoration',
    extraInfo: {},
  };
}

function constructPersistedState(axMode: boolean): PersistedState {
  if (!axMode) {
    return {
      rootElement: 'root',
      rootAXElement: null,
      elements: {},
      AXelements: {},
    };
  }
  return {
    rootElement: null,
    rootAXElement: 'root',
    elements: {},
    AXelements: {},
  };
}
let state = constructPersistedState(false);

function populateChildren(state: PersistedState, axMode: boolean) {
  const elements: ElementMap = {};
  elements['root'] = constructElement('root', 'root view', [
    'child0',
    'child1',
  ]);

  elements['child0'] = constructElement('child0', 'child0 view', [
    'child0_child0',
    'child0_child1',
  ]);
  elements['child1'] = constructElement('child1', 'child1 view', [
    'child1_child0',
    'child1_child1',
  ]);
  elements['child0_child0'] = constructElement(
    'child0_child0',
    'child0_child0 view',
    [],
  );
  elements['child0_child1'] = constructElement(
    'child0_child1',
    'child0_child1 view',
    [],
  );
  elements['child1_child0'] = constructElement(
    'child1_child0',
    'child1_child0 view',
    [],
  );
  elements['child1_child1'] = constructElement(
    'child1_child1',
    'child1_child1 view',
    [],
  );
  state.elements = elements;
  if (axMode) {
    state.AXelements = elements;
  }
}

beforeEach(() => {
  state = constructPersistedState(false);
  populateChildren(state, false);
});

test('test the searchNode for root in axMode false', async () => {
  const searchResult: SearchResultTree | null = await searchNodes(
    state.elements['root'],
    'root',
    false,
    state,
  );
  expect(searchResult).toBeDefined();
  expect(searchResult).toEqual({
    id: 'root',
    isMatch: true,
    hasChildren: false,
    children: [],
    element: state.elements['root'],
    axElement: null,
  });
});

test('test the searchNode for root in axMode true', async () => {
  state = constructPersistedState(true);
  populateChildren(state, true);
  const searchResult: SearchResultTree | null = await searchNodes(
    state.AXelements['root'],
    'RoOT',
    true,
    state,
  );
  expect(searchResult).toBeDefined();
  expect(searchResult).toEqual({
    id: 'root',
    isMatch: true,
    hasChildren: false,
    children: [],
    element: state.AXelements['root'], // Even though AXElement exists, normal element will exist too
    axElement: state.AXelements['root'],
  });
});

test('test the searchNode which matches just one child', async () => {
  const searchResult: SearchResultTree | null = await searchNodes(
    state.elements['root'],
    'child0_child0',
    false,
    state,
  );
  expect(searchResult).toBeDefined();
  expect(searchResult).toEqual({
    id: 'root',
    isMatch: false,
    hasChildren: true,
    children: [
      {
        id: 'child0',
        isMatch: false,
        hasChildren: true,
        children: [
          {
            id: 'child0_child0',
            isMatch: true,
            hasChildren: false,
            children: [],
            element: state.elements['child0_child0'],
            axElement: null,
          },
        ],
        element: state.elements['child0'],
        axElement: null,
      },
    ],
    element: state.elements['root'],
    axElement: null,
  });
});

test('test the searchNode for which matches multiple child', async () => {
  const searchResult: SearchResultTree | null = await searchNodes(
    state.elements['root'],
    'child0',
    false,
    state,
  );
  expect(searchResult).toBeDefined();
  const expectedSearchResult = {
    id: 'root',
    isMatch: false,
    hasChildren: true,
    children: [
      {
        id: 'child0',
        isMatch: true,
        hasChildren: true,
        children: [
          {
            id: 'child0_child0',
            isMatch: true,
            hasChildren: false,
            children: [],
            element: state.elements['child0_child0'],
            axElement: null,
          },
          {
            id: 'child0_child1',
            isMatch: true,
            hasChildren: false,
            children: [],
            element: state.elements['child0_child1'],
            axElement: null,
          },
        ],
        element: state.elements['child0'],
        axElement: null,
      },
      {
        id: 'child1',
        isMatch: false,
        hasChildren: true,
        children: [
          {
            id: 'child1_child0',
            isMatch: true,
            hasChildren: false,
            children: [],
            element: state.elements['child1_child0'],
            axElement: null,
          },
        ],
        element: state.elements['child1'],
        axElement: null,
      },
    ],
    element: state.elements['root'],
    axElement: null,
  };
  expect(searchResult).toEqual(expectedSearchResult);
});

test('test the searchNode, it should not be case sensitive', async () => {
  const searchResult: SearchResultTree | null = await searchNodes(
    state.elements['root'],
    'ChIlD0',
    false,
    state,
  );
  expect(searchResult).toBeDefined();
  const expectedSearchResult = {
    id: 'root',
    isMatch: false,
    hasChildren: true,
    children: [
      {
        id: 'child0',
        isMatch: true,
        hasChildren: true,
        children: [
          {
            id: 'child0_child0',
            isMatch: true,
            hasChildren: false,
            children: [],
            element: state.elements['child0_child0'],
            axElement: null,
          },
          {
            id: 'child0_child1',
            isMatch: true,
            hasChildren: false,
            children: [],
            element: state.elements['child0_child1'],
            axElement: null,
          },
        ],
        element: state.elements['child0'],
        axElement: null,
      },
      {
        id: 'child1',
        isMatch: false,
        hasChildren: true,
        children: [
          {
            id: 'child1_child0',
            isMatch: true,
            hasChildren: false,
            children: [],
            element: state.elements['child1_child0'],
            axElement: null,
          },
        ],
        element: state.elements['child1'],
        axElement: null,
      },
    ],
    element: state.elements['root'],
    axElement: null,
  };
  expect(searchResult).toEqual(expectedSearchResult);
});

test('test the searchNode for non existent query', async () => {
  const searchResult: SearchResultTree | null = await searchNodes(
    state.elements['root'],
    'Unknown query',
    false,
    state,
  );
  expect(searchResult).toBeNull();
});

test('test the call method with getRoot', async () => {
  const proxyClient = new ProxyArchiveClient(state);
  const root: Element = await proxyClient.call('getRoot');
  expect(root).toEqual(state.elements['root']);
});

test('test the call method with getAXRoot', async () => {
  state = constructPersistedState(true);
  populateChildren(state, true);
  const proxyClient = new ProxyArchiveClient(state);
  const root: Element = await proxyClient.call('getAXRoot');
  expect(root).toEqual(state.AXelements['root']);
});

test('test the call method with getNodes', async () => {
  const proxyClient = new ProxyArchiveClient(state);
  const nodes: Array<Element> = await proxyClient.call('getNodes', {
    ids: ['child0_child1', 'child1_child0'],
  });
  expect(nodes).toEqual({
    elements: [
      {
        id: 'child0_child1',
        name: 'child0_child1 view',
        expanded: false,
        children: [],
        attributes: [],
        data: {},
        decoration: 'decoration',
        extraInfo: {},
      },
      {
        id: 'child1_child0',
        name: 'child1_child0 view',
        expanded: false,
        children: [],
        attributes: [],
        data: {},
        decoration: 'decoration',
        extraInfo: {},
      },
    ],
  });
});

test('test the call method with getAXNodes', async () => {
  state = constructPersistedState(true);
  populateChildren(state, true);
  const proxyClient = new ProxyArchiveClient(state);
  const nodes: Array<Element> = await proxyClient.call('getAXNodes', {
    ids: ['child0_child1', 'child1_child0'],
  });
  expect(nodes).toEqual({
    elements: [
      {
        id: 'child0_child1',
        name: 'child0_child1 view',
        expanded: false,
        children: [],
        attributes: [],
        data: {},
        decoration: 'decoration',
        extraInfo: {},
      },
      {
        id: 'child1_child0',
        name: 'child1_child0 view',
        expanded: false,
        children: [],
        attributes: [],
        data: {},
        decoration: 'decoration',
        extraInfo: {},
      },
    ],
  });
});

test('test different methods of calls with no params', async () => {
  const proxyClient = new ProxyArchiveClient(state);
  await expect(proxyClient.call('getNodes')).rejects.toThrow(
    new Error('Called getNodes with no params'),
  );
  await expect(proxyClient.call('getAXNodes')).rejects.toThrow(
    new Error('Called getAXNodes with no params'),
  );
  // let result: Error = await proxyClient.call('getSearchResults');
  await expect(proxyClient.call('getSearchResults')).rejects.toThrow(
    new Error('Called getSearchResults with no params'),
  );
  await expect(
    proxyClient.call('getSearchResults', {
      query: 'random',
      axEnabled: true,
    }),
  ).rejects.toThrow(new Error('rootAXElement is undefined'));
  await expect(
    proxyClient.call('getSearchResults', {
      axEnabled: false,
    }),
  ).rejects.toThrow(
    new Error('query is not passed as a params to getSearchResults'),
  );
});

test('test call method isConsoleEnabled', () => {
  const proxyClient = new ProxyArchiveClient(state);
  return expect(proxyClient.call('isConsoleEnabled')).resolves.toBe(false);
});

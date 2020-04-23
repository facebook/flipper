/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Element} from 'flipper';
import {PersistedState} from './index';
import {SearchResultTree} from './Search';
import {cloneDeep} from 'lodash';

const propsForPersistedState = (
  AXMode: boolean,
): {
  ROOT: 'rootAXElement' | 'rootElement';
  ELEMENTS: 'AXelements' | 'elements';
  ELEMENT: 'axElement' | 'element';
} => {
  return {
    ROOT: AXMode ? 'rootAXElement' : 'rootElement',
    ELEMENTS: AXMode ? 'AXelements' : 'elements',
    ELEMENT: AXMode ? 'axElement' : 'element',
  };
};

function constructSearchResultTree(
  node: Element,
  isMatch: boolean,
  children: Array<SearchResultTree>,
  _AXMode: boolean,
  AXNode: Element | null,
): SearchResultTree {
  const searchResult = {
    id: node.id,
    isMatch,
    hasChildren: children.length > 0,
    children: children.length > 0 ? children : [],
    element: node,
    axElement: AXNode,
  };
  return searchResult;
}

function isMatch(element: Element, query: string): boolean {
  const nameMatch = element.name.toLowerCase().includes(query.toLowerCase());
  return nameMatch || element.id === query;
}

export function searchNodes(
  node: Element,
  query: string,
  AXMode: boolean,
  state: PersistedState,
): SearchResultTree | null {
  // Even if the axMode is true, we will have to search the normal elements too.
  // The AXEelements will automatically populated in constructSearchResultTree
  const elements = state[propsForPersistedState(false).ELEMENTS];
  const children: Array<SearchResultTree> = [];
  const match = isMatch(node, query);

  for (const childID of node.children) {
    const child = elements[childID];
    const tree = searchNodes(child, query, AXMode, state);
    if (tree) {
      children.push(tree);
    }
  }

  if (match || children.length > 0) {
    return cloneDeep(
      constructSearchResultTree(
        node,
        match,
        children,
        AXMode,
        AXMode ? state.AXelements[node.id] : null,
      ),
    );
  }
  return null;
}

class ProxyArchiveClient {
  constructor(
    persistedState: PersistedState,
    onElementHighlighted?: (id: string) => void,
  ) {
    this.persistedState = cloneDeep(persistedState);
    this.onElementHighlighted = onElementHighlighted;
  }
  persistedState: PersistedState;
  onElementHighlighted: ((id: string) => void) | undefined;
  subscribe(_method: string, _callback: (params: any) => void): void {
    return;
  }

  supportsMethod(_method: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  send(_method: string, _params?: Object): void {
    return;
  }

  call(method: string, paramaters?: {[key: string]: any}): Promise<any> {
    switch (method) {
      case 'getRoot': {
        const {rootElement} = this.persistedState;
        if (!rootElement) {
          return Promise.resolve(null);
        }
        return Promise.resolve(this.persistedState.elements[rootElement]);
      }
      case 'getAXRoot': {
        const {rootAXElement} = this.persistedState;
        if (!rootAXElement) {
          return Promise.resolve(null);
        }
        return Promise.resolve(this.persistedState.AXelements[rootAXElement]);
      }
      case 'getNodes': {
        if (!paramaters) {
          return Promise.reject(new Error('Called getNodes with no params'));
        }
        const {ids} = paramaters;
        const arr: Array<Element> = [];
        for (const id of ids) {
          arr.push(this.persistedState.elements[id]);
        }
        return Promise.resolve({elements: arr});
      }
      case 'getAXNodes': {
        if (!paramaters) {
          return Promise.reject(new Error('Called getAXNodes with no params'));
        }
        const {ids} = paramaters;
        const arr: Array<Element> = [];
        for (const id of ids) {
          arr.push(this.persistedState.AXelements[id]);
        }
        return Promise.resolve({elements: arr});
      }
      case 'getSearchResults': {
        const {rootElement, rootAXElement} = this.persistedState;

        if (!paramaters) {
          return Promise.reject(
            new Error('Called getSearchResults with no params'),
          );
        }
        const {query, axEnabled} = paramaters;
        if (!query) {
          return Promise.reject(
            new Error('query is not passed as a params to getSearchResults'),
          );
        }
        let element: Element;
        if (axEnabled) {
          if (!rootAXElement) {
            return Promise.reject(new Error('rootAXElement is undefined'));
          }
          element = this.persistedState.AXelements[rootAXElement];
        } else {
          if (!rootElement) {
            return Promise.reject(new Error('rootElement is undefined'));
          }
          element = this.persistedState.elements[rootElement];
        }
        const output = searchNodes(
          element,
          query,
          axEnabled,
          this.persistedState,
        );
        return Promise.resolve({results: output, query});
      }
      case 'isConsoleEnabled': {
        return Promise.resolve(false);
      }
      case 'setHighlighted': {
        const id = paramaters?.id;
        this.onElementHighlighted && this.onElementHighlighted(id);
        return Promise.resolve();
      }
      default: {
        return Promise.resolve();
      }
    }
  }
}
export default ProxyArchiveClient;

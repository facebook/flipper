/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Element, ElementID} from 'flipper';
import type {PersistedState} from './index';
import type {SearchResultTree} from './Search';
// $FlowFixMe
import cloneDeep from 'lodash.clonedeep';

const propsForPersistedState = (
  AXMode: boolean,
): {ROOT: string, ELEMENTS: string, ELEMENT: string} => {
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
  AXMode: boolean,
  AXNode: ?Element,
): SearchResultTree {
  let searchResult = {
    id: node.id,
    isMatch,
    hasChildren: children.length > 0,
    children: children.length > 0 ? children : null,
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
): ?SearchResultTree {
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
  constructor(persistedState: PersistedState) {
    this.persistedState = cloneDeep(persistedState);
  }
  persistedState: PersistedState;
  subscribe(method: string, callback: (params: any) => void): void {
    return;
  }

  supportsMethod(method: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  send(method: string, params?: Object): void {
    return;
  }

  call(method: string, params?: Object): Promise<any> {
    const paramaters = params;
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
        for (let id: ElementID of ids) {
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
        for (let id: ElementID of ids) {
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
        let element = {};
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
      default: {
        return Promise.resolve();
      }
    }
  }
}
export default ProxyArchiveClient;

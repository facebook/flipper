/**
 * Copyright 2004-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {ElementID, Element} from 'sonar';
import {
  colors,
  Glyph,
  FlexBox,
  FlexRow,
  FlexColumn,
  Toolbar,
  SonarPlugin,
  ElementsInspector,
  InspectorSidebar,
  LoadingIndicator,
} from 'sonar';

// $FlowFixMe
import debounce from 'lodash.debounce';

export type InspectorState = {|
  initialised: boolean,
  selected: ?ElementID,
  root: ?ElementID,
  elements: {[key: ElementID]: Element},
  isSearchActive: boolean,
|};

type SelectElementArgs = {|
  key: ElementID,
|};

type ExpandElementArgs = {|
  key: ElementID,
  expand: boolean,
|};

type ExpandElementsArgs = {|
  elements: Array<ElementID>,
|};

type UpdateElementsArgs = {|
  elements: Array<$Shape<Element>>,
|};

type SetRootArgs = {|
  root: ElementID,
|};

type GetNodesResult = {|
  elements: Array<Element>,
|};

const Center = FlexRow.extends({
  alignItems: 'center',
  justifyContent: 'center',
});

type SearchResultTree = {|
  id: string,
  isMatch: Boolean,
  children: ?Array<SearchResultTree>,
  element: Element,
|};

export default class extends SonarPlugin<InspectorState> {
  static title = 'Layout';
  static id = 'Inspector';
  static icon = 'target';

  state = {
    elements: {},
    initialised: false,
    isSearchActive: false,
    root: null,
    selected: null,
  };

  reducers = {
    SelectElement(state: InspectorState, {key}: SelectElementArgs) {
      return {
        selected: key,
      };
    },

    ExpandElement(state: InspectorState, {expand, key}: ExpandElementArgs) {
      return {
        elements: {
          ...state.elements,
          [key]: {
            ...state.elements[key],
            expanded: expand,
          },
        },
      };
    },

    ExpandElements(state: InspectorState, {elements}: ExpandElementsArgs) {
      const expandedSet = new Set(elements);
      const newState = {
        elements: {
          ...state.elements,
        },
      };
      for (const key of Object.keys(state.elements)) {
        newState.elements[key] = {
          ...newState.elements[key],
          expanded: expandedSet.has(key),
        };
      }
      return newState;
    },

    UpdateElements(state: InspectorState, {elements}: UpdateElementsArgs) {
      const updatedElements = state.elements;

      for (const element of elements) {
        const current = updatedElements[element.id] || {};
        // $FlowFixMe
        updatedElements[element.id] = {
          ...current,
          ...element,
        };
      }

      return {elements: updatedElements};
    },

    SetRoot(state: InspectorState, {root}: SetRootArgs) {
      return {root};
    },

    SetSearchActive(
      state: InspectorState,
      {isSearchActive}: {isSearchActive: boolean},
    ) {
      return {isSearchActive};
    },
  };

  search(query: string) {
    this.client
      .call('getSearchResults', {query: query})
      .then(response => this.displaySearchResults(response));
  }

  executeCommand(command: string) {
    return this.client.call('executeCommand', {
      command: command,
      context: this.state.selected,
    });
  }

  /**
   * When opening the inspector for the first time, expand all elements that contain only 1 child
   * recursively.
   */
  async performInitialExpand(element: Element): Promise<void> {
    if (!element.children.length) {
      // element has no children so we're as deep as we can be
      return;
    }

    this.dispatchAction({expand: true, key: element.id, type: 'ExpandElement'});

    return this.getChildren(element.id).then((elements: Array<Element>) => {
      this.dispatchAction({elements, type: 'UpdateElements'});

      if (element.children.length >= 2) {
        // element has two or more children so we can stop expanding
        return;
      }

      return this.performInitialExpand(
        this.state.elements[element.children[0]],
      );
    });
  }

  displaySearchResults({resultTree}: {resultTree: SearchResultTree}) {
    const elements = this.getElementsFromSearchResultTree(resultTree);
    const idsToExpand = elements
      .filter(x => x.hasChildren)
      .map(x => x.element.id);

    this.dispatchAction({
      elements: elements.map(x => x.element),
      type: 'UpdateElements',
    });
    this.dispatchAction({
      elements: idsToExpand,
      type: 'ExpandElements',
    });
  }

  getElementsFromSearchResultTree(tree: SearchResultTree) {
    if (!tree) {
      return [];
    }
    var elements = [
      {
        id: tree.id,
        isMatch: tree.isMatch,
        hasChildren: Boolean(tree.children),
        element: tree.element,
      },
    ];
    if (tree.children) {
      for (const child of tree.children) {
        elements = elements.concat(this.getElementsFromSearchResultTree(child));
      }
    }
    return elements;
  }

  init() {
    performance.mark('LayoutInspectorInitialize');
    this.client.call('getRoot').then((element: Element) => {
      this.dispatchAction({elements: [element], type: 'UpdateElements'});
      this.dispatchAction({root: element.id, type: 'SetRoot'});
      this.performInitialExpand(element).then(() => {
        this.app.logger.trackTimeSince('LayoutInspectorInitialize');
        this.setState({initialised: true});
      });
    });

    this.client.subscribe('invalidate', ({id}: {id: ElementID}) => {
      this.invalidate([id]).then((elements: Array<Element>) => {
        this.dispatchAction({elements, type: 'UpdateElements'});
      });
    });

    this.client.subscribe('select', ({path}: {path: Array<ElementID>}) => {
      this.getNodesAndDirectChildren(path).then((elements: Array<Element>) => {
        const selected = path[path.length - 1];

        this.dispatchAction({elements, type: 'UpdateElements'});
        this.dispatchAction({key: selected, type: 'SelectElement'});
        this.dispatchAction({isSearchActive: false, type: 'SetSearchActive'});

        for (const key of path) {
          this.dispatchAction({expand: true, key, type: 'ExpandElement'});
        }

        this.client.send('setHighlighted', {id: selected});
        this.client.send('setSearchActive', {active: false});
      });
    });

    window.search = this.search.bind(this);
  }

  invalidate(ids: Array<ElementID>): Promise<Array<Element>> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }

    return this.getNodes(ids, true).then((elements: Array<Element>) => {
      const children = elements
        .filter(element => {
          const prev = this.state.elements[element.id];
          return prev && prev.expanded;
        })
        .map(element => element.children)
        .reduce((acc, val) => acc.concat(val), []);

      return Promise.all([elements, this.invalidate(children)]).then(arr => {
        return arr.reduce((acc, val) => acc.concat(val), []);
      });
    });
  }

  getNodesAndDirectChildren(ids: Array<ElementID>): Promise<Array<Element>> {
    return this.getNodes(ids, false).then((elements: Array<Element>) => {
      const children = elements
        .map(element => element.children)
        .reduce((acc, val) => acc.concat(val), []);

      return Promise.all([elements, this.getNodes(children, false)]).then(
        arr => {
          return arr.reduce((acc, val) => acc.concat(val), []);
        },
      );
    });
  }

  getChildren(key: ElementID): Promise<Array<Element>> {
    return this.getNodes(this.state.elements[key].children, false);
  }

  getNodes(
    ids: Array<ElementID> = [],
    force: boolean,
  ): Promise<Array<Element>> {
    if (!force) {
      ids = ids.filter(id => {
        return this.state.elements[id] === undefined;
      });
    }

    if (ids.length > 0) {
      performance.mark('LayoutInspectorGetNodes');
      return this.client
        .call('getNodes', {ids})
        .then(({elements}: GetNodesResult) => {
          this.app.logger.trackTimeSince('LayoutInspectorGetNodes');
          return Promise.resolve(elements);
        });
    } else {
      return Promise.resolve([]);
    }
  }

  isExpanded(key: ElementID): boolean {
    return this.state.elements[key].expanded;
  }

  expandElement = (key: ElementID): Promise<Array<Element>> => {
    const expand = !this.isExpanded(key);
    return this.setElementExpanded(key, expand);
  };

  setElementExpanded = (
    key: ElementID,
    expand: boolean,
  ): Promise<Array<Element>> => {
    this.dispatchAction({expand, key, type: 'ExpandElement'});
    performance.mark('LayoutInspectorExpandElement');
    if (expand) {
      return this.getChildren(key).then((elements: Array<Element>) => {
        this.app.logger.trackTimeSince('LayoutInspectorExpandElement');
        this.dispatchAction({elements, type: 'UpdateElements'});
        return Promise.resolve(elements);
      });
    } else {
      return Promise.resolve([]);
    }
  };

  deepExpandElement = async (key: ElementID) => {
    const expand = !this.isExpanded(key);
    if (!expand) {
      // we never deep unexpand
      return this.setElementExpanded(key, false);
    }

    // queue of keys to open
    const keys = [key];

    // amount of elements we've expanded, we stop at 100 just to be safe
    let count = 0;

    while (keys.length && count < 100) {
      const key = keys.shift();

      // expand current element
      const children = await this.setElementExpanded(key, true);

      // and add it's children to the queue
      for (const child of children) {
        keys.push(child.id);
      }

      count++;
    }
  };

  onElementExpanded = (key: ElementID, deep: boolean) => {
    if (deep) {
      this.deepExpandElement(key);
    } else {
      this.expandElement(key);
    }
    this.app.logger.track('usage', 'layout:element-expanded', {
      id: key,
      deep: deep,
    });
  };

  onFindClick = () => {
    const isSearchActive = !this.state.isSearchActive;
    this.dispatchAction({isSearchActive, type: 'SetSearchActive'});
    this.client.send('setSearchActive', {active: isSearchActive});
  };

  onElementSelected = debounce((key: ElementID) => {
    this.dispatchAction({key, type: 'SelectElement'});
    this.client.send('setHighlighted', {id: key});
    this.getNodes([key], true).then((elements: Array<Element>) => {
      this.dispatchAction({elements, type: 'UpdateElements'});
    });
  });

  onElementHovered = debounce((key: ?ElementID) => {
    this.client.send('setHighlighted', {id: key});
  });

  onDataValueChanged = (path: Array<string>, value: any) => {
    this.client.send('setData', {id: this.state.selected, path, value});
    this.app.logger.track('usage', 'layout:value-changed', {
      id: this.state.selected,
      value: value,
      path: path,
    });
  };

  renderSidebar = () => {
    return this.state.selected != null ? (
      <InspectorSidebar
        element={this.state.elements[this.state.selected]}
        onValueChanged={this.onDataValueChanged}
        client={this.client}
      />
    ) : null;
  };

  render() {
    const {initialised, selected, root, elements, isSearchActive} = this.state;

    return (
      <FlexColumn fill={true}>
        <Toolbar compact={true}>
          <FlexBox
            onClick={this.onFindClick}
            role="button"
            tabIndex={-1}
            title="Select an element on the device to inspect it">
            <Glyph
              variant="outline"
              name="target"
              size={16}
              color={
                isSearchActive
                  ? colors.macOSTitleBarIconSelected
                  : colors.macOSTitleBarIconActive
              }
            />
          </FlexBox>
        </Toolbar>
        <FlexRow fill={true}>
          {initialised ? (
            <ElementsInspector
              onElementSelected={this.onElementSelected}
              onElementHovered={this.onElementHovered}
              onElementExpanded={this.onElementExpanded}
              onValueChanged={this.onDataValueChanged}
              selected={selected}
              root={root}
              elements={elements}
            />
          ) : (
            <Center fill={true}>
              <LoadingIndicator />
            </Center>
          )}
        </FlexRow>
      </FlexColumn>
    );
  }
}

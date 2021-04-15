/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  ElementID,
  Element,
  PluginClient,
  ElementsInspector,
  ElementSearchResultSet,
  FlexColumn,
  styled,
} from 'flipper';
import {debounce} from 'lodash';
import {Component} from 'react';
import {PersistedState, ElementMap} from './';
import React from 'react';
import MultipleSelectorSection from './MultipleSelectionSection';

const ElementsInspectorContainer = styled(FlexColumn)({
  width: '100%',
  justifyContent: 'space-between',
});

type GetNodesOptions = {
  force?: boolean;
  ax?: boolean;
  forAccessibilityEvent?: boolean;
};

export type ElementSelectorNode = {[id: string]: ElementSelectorNode};
export type ElementSelectorData = {
  leaves: Array<ElementID>;
  tree: ElementSelectorNode;
  elements: ElementMap;
};

type Props = {
  ax?: boolean;
  client: PluginClient;
  showsSidebar: boolean;
  inAlignmentMode?: boolean;
  selectedElement: ElementID | null | undefined;
  selectedAXElement: ElementID | null | undefined;
  onSelect: (ids: ElementID | null | undefined) => void;
  setPersistedState: (state: Partial<PersistedState>) => void;
  persistedState: PersistedState;
  searchResults: ElementSearchResultSet | null;
};

type State = {
  elementSelector: ElementSelectorData | null;
  axElementSelector: ElementSelectorData | null;
};

export default class Inspector extends Component<Props, State> {
  state: State = {elementSelector: null, axElementSelector: null};

  call() {
    return {
      GET_ROOT: this.props.ax ? 'getAXRoot' : 'getRoot',
      INVALIDATE: this.props.ax ? 'invalidateAX' : 'invalidate',
      GET_NODES: this.props.ax ? 'getAXNodes' : 'getNodes',
      SET_HIGHLIGHTED: 'setHighlighted',
      SELECT: this.props.ax ? 'selectAX' : 'select',
      INVALIDATE_WITH_DATA: this.props.ax
        ? 'invalidateWithDataAX'
        : 'invalidateWithData',
    };
  }

  selected = () => {
    return this.props.ax
      ? this.props.selectedAXElement
      : this.props.selectedElement;
  };

  root = () => {
    return this.props.ax
      ? this.props.persistedState.rootAXElement
      : this.props.persistedState.rootElement;
  };

  elements = () => {
    return this.props.ax
      ? this.props.persistedState.AXelements
      : this.props.persistedState.elements;
  };

  focused = () => {
    if (!this.props.ax) {
      return null;
    }
    const elements: Array<Element> = Object.values(
      this.props.persistedState.AXelements,
    );
    const focusedElement = elements.find((i) =>
      Boolean(
        i.data.Accessibility && i.data.Accessibility['accessibility-focused'],
      ),
    );
    return focusedElement ? focusedElement.id : null;
  };

  getAXContextMenuExtensions = () =>
    this.props.ax
      ? [
          {
            label: 'Focus',
            click: (id: ElementID) => {
              if (this.props.client.isConnected) {
                this.props.client.call('onRequestAXFocus', {id});
              }
            },
          },
        ]
      : [];

  componentDidMount() {
    if (!this.props.client.isConnected) {
      return;
    }
    this.props.client.call(this.call().GET_ROOT).then((root: Element) => {
      this.props.setPersistedState({
        [this.props.ax ? 'rootAXElement' : 'rootElement']: root.id,
      });
      this.updateElement(root.id, {...root, expanded: true});
      this.performInitialExpand(root);
    });

    this.props.client.subscribe(
      this.call().INVALIDATE,
      ({
        nodes,
      }: {
        nodes: Array<{id: ElementID; children: Array<ElementID>}>;
      }) => {
        const ids = nodes
          .map((n) => [n.id, ...(n.children || [])])
          .reduce((acc, cv) => acc.concat(cv), []);
        this.invalidate(ids);
      },
    );

    this.props.client.subscribe(
      this.call().INVALIDATE_WITH_DATA,
      (obj: {nodes: Array<Element>}) => {
        const {nodes} = obj;
        this.invalidateWithData(nodes);
      },
    );

    this.props.client.subscribe(
      this.call().SELECT,
      async ({
        path,
        tree,
      }: {
        path?: Array<ElementID>;
        tree?: ElementSelectorNode;
      }) => {
        if (path) {
          this.getAndExpandPath(path);
        }
        if (tree) {
          const leaves = this.getElementLeaves(tree);
          const elementArray = await this.getNodes(leaves, {});
          const elements = leaves.reduce(
            (acc, cur, idx) => ({...acc, [cur]: elementArray[idx]}),
            {},
          );
          if (this.props.ax) {
            this.setState({axElementSelector: {tree, leaves, elements}});
          } else {
            this.setState({elementSelector: {tree, leaves, elements}});
          }
        }
      },
    );

    if (this.props.ax) {
      this.props.client.subscribe('axFocusEvent', () => {
        // update all nodes, to find new focused node
        this.getNodes(Object.keys(this.props.persistedState.AXelements), {
          force: true,
          ax: true,
        });
      });
    }
  }

  componentDidUpdate(prevProps: Props) {
    const {ax, selectedElement, selectedAXElement} = this.props;

    if (
      ax &&
      selectedElement &&
      selectedElement !== prevProps.selectedElement
    ) {
      // selected element in non-AX tree changed, find linked element in AX tree
      const newlySelectedElem = this.props.persistedState.elements[
        selectedElement
      ];
      if (newlySelectedElem) {
        this.props.onSelect(
          newlySelectedElem.extraInfo
            ? newlySelectedElem.extraInfo.linkedNode
            : null,
        );
      }
    } else if (
      !ax &&
      selectedAXElement &&
      selectedAXElement !== prevProps.selectedAXElement
    ) {
      // selected element in AX tree changed, find linked element in non-AX tree
      const newlySelectedAXElem = this.props.persistedState.AXelements[
        selectedAXElement
      ];
      if (newlySelectedAXElem) {
        this.props.onSelect(
          newlySelectedAXElem.extraInfo
            ? newlySelectedAXElem.extraInfo.linkedNode
            : null,
        );
      }
    }
  }

  invalidateWithData(elements: Array<Element>): void {
    if (elements.length === 0) {
      return;
    }
    const updatedElements: ElementMap = elements.reduce(
      (acc: ElementMap, element: Element) => {
        acc[element.id] = {
          ...element,
          expanded: this.elements()[element.id]
            ? this.elements()[element.id].expanded
            : false,
        };
        return acc;
      },
      {},
    );
    this.props.setPersistedState({
      [this.props.ax ? 'AXelements' : 'elements']: {
        ...this.elements(),
        ...updatedElements,
      },
    });
  }

  async invalidate(ids: Array<ElementID>): Promise<Array<Element>> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    const elements = await this.getNodes(ids, {});
    const children = elements
      .filter(
        (element: Element) =>
          this.elements()[element.id] && this.elements()[element.id].expanded,
      )
      .map((element: Element) => element.children)
      .reduce((acc, val) => acc.concat(val), []);
    return this.invalidate(children);
  }

  updateElement(id: ElementID, data: Object) {
    this.props.setPersistedState({
      [this.props.ax ? 'AXelements' : 'elements']: {
        ...this.elements(),
        [id]: {
          ...this.elements()[id],
          ...data,
        },
      },
    });
  }

  // When opening the inspector for the first time, expand all elements that
  // contain only 1 child recursively.
  async performInitialExpand(element: Element): Promise<void> {
    if (!element.children.length) {
      // element has no children so we're as deep as we can be
      return;
    }
    return this.getChildren(element.id, {}).then(() => {
      if (element.children.length >= 2) {
        // element has two or more children so we can stop expanding
        return;
      }
      return this.performInitialExpand(this.elements()[element.children[0]]);
    });
  }

  async getChildren(
    id: ElementID,
    options: GetNodesOptions,
  ): Promise<Array<Element>> {
    if (!this.elements()[id]) {
      await this.getNodes([id], options);
    }
    this.updateElement(id, {expanded: true});
    return this.getNodes(this.elements()[id].children, options);
  }

  async getNodes(
    ids: Array<ElementID> = [],
    options: GetNodesOptions,
  ): Promise<Array<Element>> {
    if (ids.length > 0 && this.props.client.isConnected) {
      const {forAccessibilityEvent} = options;
      const {
        elements,
      }: {elements: Array<Element>} = await this.props.client.call(
        this.call().GET_NODES,
        {
          ids,
          forAccessibilityEvent,
          selected: false,
        },
      );
      elements.forEach((e) => this.updateElement(e.id, e));
      return elements;
    } else {
      return [];
    }
  }

  async getAndExpandPath(path: Array<ElementID>) {
    await Promise.all(path.map((id) => this.getChildren(id, {})));
    for (const id of path) {
      this.updateElement(id, {expanded: true});
    }
    this.onElementSelected()(path[path.length - 1]);
  }

  getElementLeaves(tree: ElementSelectorNode): Array<ElementID> {
    return tree
      ? Object.entries(tree).reduce(
          (
            currLeafNode: Array<ElementID>,
            [id, children]: [ElementID, ElementSelectorNode],
          ): Array<ElementID> =>
            currLeafNode.concat(
              Object.keys(children).length > 0
                ? this.getElementLeaves(children)
                : [id],
            ),
          [],
        )
      : [];
  }

  /// Return path from given tree structure and id if id is not null; otherwise return any path
  getPathForNode(
    tree: ElementSelectorNode,
    nodeID: ElementID | null,
  ): Array<ElementID> | null {
    for (const node in tree) {
      if (
        node === nodeID ||
        (nodeID === null && Object.keys(tree[node]).length == 0)
      ) {
        return [node];
      }
      const path = this.getPathForNode(tree[node], nodeID);
      if (path !== null) {
        return [node].concat(path);
      }
    }
    return null;
  }

  // NOTE: this will be used in the future when we remove path and use tree instead
  async _getAndExpandPathFromTree(tree: ElementSelectorNode) {
    this.getAndExpandPath(this.getPathForNode(tree, null) ?? []);
  }

  onElementSelected = (option?: {
    cancelSelector?: boolean;
    expandPathToElement?: boolean;
  }) =>
    debounce(async (selectedKey: ElementID) => {
      if (option?.cancelSelector) {
        this.setState({elementSelector: null, axElementSelector: null});
      }
      if (option?.expandPathToElement) {
        const data = this.props.ax
          ? this.state.axElementSelector
          : this.state.elementSelector;
        await this.getAndExpandPath(
          this.getPathForNode(data?.tree ?? {}, selectedKey) ?? [],
        );
      }
      this.onElementHovered(selectedKey);
      this.props.onSelect(selectedKey);
    });

  onElementSelectedAtMainSection = this.onElementSelected({
    cancelSelector: true,
  });

  onElementSelectedAndExpanded = this.onElementSelected({
    expandPathToElement: true,
  });

  onElementHovered = debounce((key: ElementID | null | undefined) => {
    if (!this.props.client.isConnected) {
      return;
    }
    this.props.client.call(this.call().SET_HIGHLIGHTED, {
      id: key,
      isAlignmentMode: this.props.inAlignmentMode,
    });
  });

  onElementExpanded = (
    id: ElementID,
    deep: boolean,
    forceExpand: boolean = false,
  ) => {
    const shouldExpand = forceExpand || !this.elements()[id].expanded;
    if (shouldExpand) {
      this.updateElement(id, {expanded: shouldExpand});
    }
    this.getChildren(id, {}).then((children) => {
      if (deep) {
        children.forEach((child) =>
          this.onElementExpanded(child.id, deep, shouldExpand),
        );
      }
    });
    if (!shouldExpand) {
      this.updateElement(id, {expanded: shouldExpand});
    }
  };

  render() {
    const selectorData = this.props.ax
      ? this.state.axElementSelector
      : this.state.elementSelector;

    return this.root() ? (
      <ElementsInspectorContainer>
        <ElementsInspector
          onElementSelected={this.onElementSelectedAtMainSection}
          onElementHovered={this.onElementHovered}
          onElementExpanded={this.onElementExpanded}
          searchResults={this.props.searchResults}
          selected={this.selected()}
          root={this.root()}
          elements={this.elements()}
          focused={this.focused()}
          contextMenuExtensions={this.getAXContextMenuExtensions}
        />
        {selectorData && selectorData.leaves.length > 1 ? (
          <MultipleSelectorSection
            initialSelectedElement={this.selected()}
            elements={selectorData.elements}
            onElementSelected={this.onElementSelectedAndExpanded}
            onElementHovered={this.onElementHovered}
          />
        ) : null}
      </ElementsInspectorContainer>
    ) : null;
  }
}

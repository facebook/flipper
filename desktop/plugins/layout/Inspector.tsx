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
} from 'flipper';
import {Component} from 'react';
import {debounce} from 'lodash';
import {PersistedState, ElementMap} from './';
import React from 'react';

type GetNodesOptions = {
  force?: boolean;
  ax?: boolean;
  forAccessibilityEvent?: boolean;
};

type ElementSelectorNode = {[id: string]: ElementSelectorNode};

type Props = {
  ax?: boolean;
  client: PluginClient;
  showsSidebar: boolean;
  inAlignmentMode?: boolean;
  selectedElement: ElementID | null | undefined;
  selectedAXElement: ElementID | null | undefined;
  onSelect: (ids: ElementID | null | undefined) => void;
  onDataValueChanged: (path: Array<string>, value: any) => void;
  setPersistedState: (state: Partial<PersistedState>) => void;
  persistedState: PersistedState;
  searchResults: ElementSearchResultSet | null;
};

export default class Inspector extends Component<Props> {
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
              this.props.client.call('onRequestAXFocus', {id});
            },
          },
        ]
      : [];

  componentDidMount() {
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
      ({path, tree}: {path?: Array<ElementID>; tree?: ElementSelectorNode}) => {
        if (tree) {
          this._getAndExpandPathFromTree(tree);
        } else if (path) {
          this.getAndExpandPath(path);
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
    if (ids.length > 0) {
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
    this.onElementSelected(path[path.length - 1]);
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

  onElementSelected = debounce((selectedKey: ElementID) => {
    this.onElementHovered(selectedKey);
    this.props.onSelect(selectedKey);
  });

  onElementHovered = debounce((key: ElementID | null | undefined) => {
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
    return this.root() ? (
      <ElementsInspector
        onElementSelected={this.onElementSelected}
        onElementHovered={this.onElementHovered}
        onElementExpanded={this.onElementExpanded}
        onValueChanged={this.props.onDataValueChanged}
        searchResults={this.props.searchResults}
        selected={this.selected()}
        root={this.root()}
        elements={this.elements()}
        focused={this.focused()}
        contextMenuExtensions={this.getAXContextMenuExtensions()}
      />
    ) : null;
  }
}

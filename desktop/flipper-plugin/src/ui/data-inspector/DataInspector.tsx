/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DataInspectorExpanded, RootDataContext} from './DataInspectorNode';
import {PureComponent, ReactElement} from 'react';
import {DataInspectorNode} from './DataInspectorNode';
import React from 'react';
import {DataValueExtractor} from './DataPreview';
import {HighlightProvider, HighlightManager} from '../Highlight';
import {Layout} from '../Layout';
import {Dropdown, MenuProps} from 'antd';
import {_tryGetFlipperLibImplementation} from 'flipper-plugin';
import {safeStringify} from 'flipper-plugin';
import {getValueAtPath} from '../data-table/DataTableManager';

export type DataInspectorProps = {
  /**
   * Object to inspect.
   */
  data: any;
  /**
   * Object to compare with the provided `data` property.
   * Differences will be styled accordingly in the UI.
   */
  diff?: any;
  /**
   * Whether to expand the root by default.
   */
  expandRoot?: boolean;
  /**
   * An optional callback that will explode a value into its type and value.
   * Useful for inspecting serialised data.
   */
  extractValue?: DataValueExtractor;
  /**
   * Callback when a value is edited.
   */
  setValue?: (path: Array<string>, val: any) => void;
  /**
   * Callback when a delete action is invoked.
   */
  onDelete?: (path: Array<string>) => void;
  /**
   * Render callback that can be used to customize the rendering of object keys.
   */
  onRenderName?: (
    path: Array<string>,
    name: string,
    highlighter: HighlightManager,
  ) => React.ReactElement;
  /**
   * Render callback that can be used to customize the rendering of object values.
   */
  onRenderDescription?: (description: React.ReactElement) => React.ReactElement;
  /**
   * Whether all objects and arrays should be collapsed by default.
   */
  collapsed?: boolean;
  /**
   * Object of all properties that will have tooltips
   */
  tooltips?: Object;
  /**
   * Filter nodes by some search text
   */
  filter?: string;

  /**
   * Highlight color of the search text
   */
  highlightColor?: string;

  /**
   * these should be ant design Menu.Item's
   */
  additionalContextMenuItems?: (
    parentPath: string[],
    value: any,
    name?: string,
  ) => ReactElement[];
};

type DataInspectorState = {
  expanded: DataInspectorExpanded;
  filterExpanded: DataInspectorExpanded;
  userExpanded: DataInspectorExpanded;
  filter: string;
  hoveredNodePath: string | undefined;
};

const MAX_RESULTS = 50;
const EMPTY_ARRAY: any[] = [];

/**
 * Wrapper around `DataInspector` that handles expanded state.
 *
 * If you require lower level access to the state then use `DataInspector`
 * directly.
 */
export class DataInspector extends PureComponent<
  DataInspectorProps,
  DataInspectorState
> {
  state = {
    expanded: {},
    userExpanded: {},
    filterExpanded: {},
    filter: '',
    hoveredNodePath: undefined,
  } as DataInspectorState;

  isContextMenuOpen = false;

  static getDerivedStateFromProps(
    nextProps: DataInspectorProps,
    currentState: DataInspectorState,
  ) {
    if (nextProps.filter?.toLowerCase() === currentState.filter) {
      return null;
    }
    if (!nextProps.filter) {
      return {
        filter: '',
        filterExpanded: {},
        // reset expanded when removing filter
        expanded: currentState.userExpanded,
      };
    }

    // TODO: Fix this the next time the file is edited.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const filter = nextProps.filter!.toLowerCase();
    const paths: (number | string)[][] = [];

    function walk(value: any, path: (number | string)[]) {
      if (paths.length > MAX_RESULTS) {
        return;
      }

      if (!value) {
        return;
      }
      if (typeof value !== 'object') {
        // TODO: Fix this the next time the file is edited.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (`${value}`.toLowerCase().includes(filter!)) {
          paths.push(path.slice());
        }
      } else if (Array.isArray(value)) {
        value.forEach((value, index) => {
          path.push(index);
          walk(value, path);
          path.pop();
        });
      } else {
        // a plain object
        Object.keys(value).forEach((key) => {
          path.push(key);
          walk(key, path); // is the key interesting?
          walk(value[key], path);
          path.pop();
        });
      }
    }

    if (filter.length >= 2) {
      walk(nextProps.data, []);
    }
    const filterExpanded: Record<string, boolean> = {};
    paths.forEach((path) => {
      for (let i = 1; i < path.length; i++)
        filterExpanded[path.slice(0, i).join('.')] = true;
    });

    return {
      filterExpanded,
      expanded: {...currentState.userExpanded, ...filterExpanded},
      filter,
    };
  }

  onExpanded = (path: string, isExpanded: boolean) => {
    this.setState({
      userExpanded: {
        ...this.state.userExpanded,
        [path]: isExpanded,
      },
      expanded: {
        ...this.state.expanded,
        [path]: isExpanded,
      },
    });
  };

  setHoveredNodePath = (path?: string) => {
    if (!this.isContextMenuOpen) {
      this.setState({
        hoveredNodePath: path,
      });
    }
  };

  removeHover = () => {
    this.setHoveredNodePath(undefined);
  };

  // make sure this fn is a stable ref to not invalidate the whole tree on new data
  getRootData = () => {
    return this.props.data;
  };

  render() {
    return (
      <Dropdown
        menu={this.getContextMenu()}
        onOpenChange={(open) => {
          this.isContextMenuOpen = open;
        }}
        trigger={['contextMenu']}>
        <Layout.Container onMouseLeave={this.removeHover}>
          <RootDataContext.Provider value={this.getRootData}>
            <HighlightProvider
              text={this.props.filter}
              highlightColor={this.props.highlightColor}>
              <DataInspectorNode
                hoveredNodePath={this.state.hoveredNodePath}
                setHoveredNodePath={this.setHoveredNodePath}
                data={this.props.data}
                diff={this.props.diff}
                extractValue={this.props.extractValue}
                setValue={this.props.setValue}
                expanded={this.state.expanded}
                onExpanded={this.onExpanded}
                onRenderName={this.props.onRenderName}
                onRenderDescription={this.props.onRenderDescription}
                expandRoot={this.props.expandRoot}
                collapsed={this.props.filter ? true : this.props.collapsed}
                tooltips={this.props.tooltips}
                parentPath={EMPTY_ARRAY}
                depth={0}
                parentAncestry={EMPTY_ARRAY}
              />
            </HighlightProvider>
          </RootDataContext.Provider>
        </Layout.Container>
      </Dropdown>
    );
  }

  getContextMenu = () => {
    const lib = _tryGetFlipperLibImplementation();

    let extraItems = [] as MenuProps['items'];

    const hoveredNodePath = this.state.hoveredNodePath;
    const value =
      hoveredNodePath != null && hoveredNodePath.length > 0
        ? getValueAtPath(this.props.data, hoveredNodePath)
        : this.props.data;
    if (
      this.props.additionalContextMenuItems != null &&
      hoveredNodePath != null &&
      hoveredNodePath.length > 0
    ) {
      const fullPath = hoveredNodePath.split('.');
      const parentPath = fullPath.slice(0, fullPath.length - 1);
      const name = fullPath[fullPath.length - 1];

      const additionalItems = this.props.additionalContextMenuItems(
        parentPath,
        value,
        name,
      );

      extraItems = [
        ...additionalItems.map((component) => ({
          key: `additionalItem-${parentPath}.${name}`,
          label: component,
        })),
        {type: 'divider'},
      ];
    }

    const items = [
      ...(extraItems as []),
      {key: 'copy-value', label: 'Copy'},
      ...(this.props.onDelete != null
        ? [{key: 'delete-value', label: 'Delete'}]
        : []),
      {type: 'divider'},
      {key: 'copy-tree', label: 'Copy full tree'},
      ...(lib?.isFB ? [{key: 'create-paste', label: 'Create paste'}] : []),
    ] as MenuProps['items'];

    return {
      items,
      onClick: (info) => {
        this.isContextMenuOpen = false;
        if (info.key === 'copy-value') {
          if (this.state.hoveredNodePath != null) {
            const value = getValueAtPath(
              this.props.data,
              this.state.hoveredNodePath,
            );
            lib?.writeTextToClipboard(safeStringify(value));
          }
        } else if (info.key === 'delete-value') {
          const pathStr = this.state.hoveredNodePath as string | undefined;
          this.props.onDelete?.(pathStr?.split('.') ?? []);
        } else if (info.key === 'copy-tree') {
          lib?.writeTextToClipboard(safeStringify(this.props.data));
        } else if (info.key === 'create-paste') {
          lib?.createPaste(safeStringify(this.props.data));
        }
      },
    } as MenuProps;
  };
}

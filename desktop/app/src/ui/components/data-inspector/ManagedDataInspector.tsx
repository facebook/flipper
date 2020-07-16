/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DataInspectorExpanded} from './DataInspector';
import {PureComponent} from 'react';
import DataInspector from './DataInspector';
import React from 'react';
import {DataValueExtractor} from './DataPreview';
import {HighlightProvider, HighlightManager} from '../Highlight';

export type ManagedDataInspectorProps = {
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
};

type ManagedDataInspectorState = {
  expanded: DataInspectorExpanded;
  filterExpanded: DataInspectorExpanded;
  userExpanded: DataInspectorExpanded;
  filter: string;
};

const MAX_RESULTS = 50;
const EMPTY_ARRAY: any[] = [];

/**
 * Wrapper around `DataInspector` that handles expanded state.
 *
 * If you require lower level access to the state then use `DataInspector`
 * directly.
 */
export default class ManagedDataInspector extends PureComponent<
  ManagedDataInspectorProps,
  ManagedDataInspectorState
> {
  state = {
    expanded: {},
    userExpanded: {},
    filterExpanded: {},
    filter: '',
  };

  static getDerivedStateFromProps(
    nextProps: ManagedDataInspectorProps,
    currentState: ManagedDataInspectorState,
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
        if (('' + value).toLowerCase().includes(filter!)) {
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

  render() {
    return (
      <HighlightProvider text={this.props.filter}>
        <DataInspector
          data={this.props.data}
          diff={this.props.diff}
          extractValue={this.props.extractValue}
          setValue={this.props.setValue}
          expanded={this.state.expanded}
          onExpanded={this.onExpanded}
          onDelete={this.props.onDelete}
          onRenderName={this.props.onRenderName}
          expandRoot={this.props.expandRoot}
          collapsed={this.props.filter ? true : this.props.collapsed}
          tooltips={this.props.tooltips}
          parentPath={EMPTY_ARRAY}
          depth={0}
          parentAncestry={EMPTY_ARRAY}
        />
      </HighlightProvider>
    );
  }
}

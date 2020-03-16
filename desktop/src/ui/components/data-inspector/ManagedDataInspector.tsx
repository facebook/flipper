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

type ManagedDataInspectorProps = {
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
   * Whether all objects and arrays should be collapsed by default.
   */
  collapsed?: boolean;
  /**
   * Object of all properties that will have tooltips
   */
  tooltips?: Object;
};

type ManagedDataInspectorState = {
  expanded: DataInspectorExpanded;
};

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
  constructor(props: ManagedDataInspectorProps, context: Object) {
    super(props, context);
    this.state = {
      expanded: {},
    };
  }

  onExpanded = (expanded: DataInspectorExpanded) => {
    this.setState({expanded});
  };

  render() {
    return (
      <DataInspector
        data={this.props.data}
        diff={this.props.diff}
        extractValue={this.props.extractValue}
        setValue={this.props.setValue}
        expanded={this.state.expanded}
        onExpanded={this.onExpanded}
        expandRoot={this.props.expandRoot}
        collapsed={this.props.collapsed}
        tooltips={this.props.tooltips}
      />
    );
  }
}

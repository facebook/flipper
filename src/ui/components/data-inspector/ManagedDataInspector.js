/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {
  DataValueExtractor,
  DataInspectorExpanded,
} from './DataInspector.js';
import {PureComponent} from 'react';
import DataInspector from './DataInspector.js';

type ManagedDataInspectorProps = {|
  /**
   * Object to inspect.
   */
  data: any,
  /**
   * Object to compare with the provided `data` property.
   * Differences will be styled accordingly in the UI.
   */
  diff?: any,
  /**
   * Whether to expand the root by default.
   */
  expandRoot?: boolean,
  /**
   * An optional callback that will explode a value into it's type and value.
   * Useful for inspecting serialised data.
   */
  extractValue?: DataValueExtractor,
  /**
   * Callback when a value is edited.
   */
  setValue?: (path: Array<string>, val: any) => void,
  /**
   * Whether all objects and arrays should be collapsed by default.
   */
  collapsed?: boolean,
|};

type ManagedDataInspectorState = {|
  expanded: DataInspectorExpanded,
|};

/**
 * Wrapper around `DataInspector` that handles expanded state.
 *
 * If you require lower level access to the state then use `DataInspector`
 * directly.
 *
 * @example Plain object
 *   <ManagedDataInspector data={{
 *     a: '',
 *     b: [1, 2, 3, 4],
 *     c: {foo: 'bar'},
 *     d: 4,
 *   }} />
 * @example Expanded root
 *   <ManagedDataInspector expandRoot={true} data={{
 *     a: '',
 *     b: [1, 2, 3, 4],
 *     c: {foo: 'bar'},
 *     d: 4,
 *   }} />
 * @example Editable
 *   <ManagedDataInspector setValue={() => {}} data={{
 *     a: '',
 *     b: [1, 2, 3, 4],
 *     c: {foo: 'bar'},
 *     d: 4,
 *   }} />
 */
export default class ManagedDataInspector extends PureComponent<
  ManagedDataInspectorProps,
  ManagedDataInspectorState,
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
      />
    );
  }
}

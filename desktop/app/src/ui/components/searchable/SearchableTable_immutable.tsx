/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Filter} from '../filter/types';
import {ManagedTableProps_immutable} from '../table/ManagedTable_immutable';
import {TableBodyRow} from '../table/types';
import Searchable, {SearchableProps} from './Searchable';
import {PureComponent} from 'react';
import ManagedTable_immutable from '../table/ManagedTable_immutable';
import deepEqual from 'deep-equal';
import React from 'react';
import {filterRowsFactory} from './SearchableTable';

type Props = {
  /** Reference to the table */
  innerRef?: (ref: React.RefObject<any>) => void;
  /** Filters that are added to the filterbar by default */
  defaultFilters: Array<Filter>;
} & ManagedTableProps_immutable &
  SearchableProps;

type State = {
  filterRows: (row: TableBodyRow) => boolean;
};

class SearchableManagedTable_immutable extends PureComponent<Props, State> {
  static defaultProps = {
    defaultFilters: [],
  };

  state = {
    filterRows: filterRowsFactory(
      this.props.filters,
      this.props.searchTerm,
      this.props.regexEnabled || false,
      this.props.contentSearchEnabled || false,
    ),
  };

  componentDidMount() {
    this.props.defaultFilters.map(this.props.addFilter);
  }

  UNSAFE_componentWillReceiveProps(nextProps: Props) {
    if (
      nextProps.searchTerm !== this.props.searchTerm ||
      nextProps.regexEnabled != this.props.regexEnabled ||
      !deepEqual(this.props.filters, nextProps.filters)
    ) {
      this.setState({
        filterRows: filterRowsFactory(
          nextProps.filters,
          nextProps.searchTerm,
          nextProps.regexEnabled || false,
          this.props.contentSearchEnabled || false,
        ),
      });
    }
  }

  render() {
    const {
      addFilter,
      searchTerm: _searchTerm,
      filters: _filters,
      innerRef,
      rows,
      ...props
    } = this.props;

    return (
      <ManagedTable_immutable
        {...props}
        filter={this.state.filterRows}
        rows={rows.filter(this.state.filterRows)}
        onAddFilter={addFilter}
        ref={innerRef}
      />
    );
  }
}

/**
 * Table with filter and searchbar, supports all properties a ManagedTable
 * and Searchable supports.
 */
export default Searchable(SearchableManagedTable_immutable);

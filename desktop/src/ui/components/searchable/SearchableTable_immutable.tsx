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
import textContent from '../../../utils/textContent';
import deepEqual from 'deep-equal';
import React from 'react';

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

const rowMatchesFilters = (filters: Array<Filter>, row: TableBodyRow) =>
  filters
    .map((filter: Filter) => {
      if (filter.type === 'enum' && row.type != null) {
        return filter.value.length === 0 || filter.value.indexOf(row.type) > -1;
      } else if (filter.type === 'include') {
        return (
          textContent(row.columns[filter.key].value).toLowerCase() ===
          filter.value.toLowerCase()
        );
      } else if (filter.type === 'exclude') {
        return (
          textContent(row.columns[filter.key].value).toLowerCase() !==
          filter.value.toLowerCase()
        );
      } else {
        return true;
      }
    })
    .every(x => x === true);

function rowMatchesRegex(values: Array<string>, regex: string): boolean {
  try {
    const re = new RegExp(regex);
    return values.some(x => re.test(x));
  } catch (e) {
    return false;
  }
}

function rowMatchesSearchTerm(
  searchTerm: string,
  isRegex: boolean,
  row: TableBodyRow,
): boolean {
  if (searchTerm == null || searchTerm.length === 0) {
    return true;
  }
  const rowValues = Object.keys(row.columns).map(key =>
    textContent(row.columns[key].value),
  );
  if (isRegex) {
    return rowMatchesRegex(rowValues, searchTerm);
  }
  return rowValues.some(x =>
    x.toLowerCase().includes(searchTerm.toLowerCase()),
  );
}

const filterRowsFactory = (
  filters: Array<Filter>,
  searchTerm: string,
  regexSearch: boolean,
) => (row: TableBodyRow): boolean =>
  rowMatchesFilters(filters, row) &&
  rowMatchesSearchTerm(searchTerm, regexSearch, row);

class SearchableManagedTable_immutable extends PureComponent<Props, State> {
  static defaultProps = {
    defaultFilters: [],
  };

  state = {
    filterRows: filterRowsFactory(
      this.props.filters,
      this.props.searchTerm,
      this.props.regexEnabled || false,
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

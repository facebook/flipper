/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Filter} from '../filter/types';
import ManagedTable, {ManagedTableProps} from '../table/ManagedTable';
import {TableBodyRow} from '../table/types';
import Searchable, {SearchableProps} from './Searchable';
import React, {PureComponent} from 'react';
import textContent from '../../../utils/textContent';
import deepEqual from 'deep-equal';

type Props = {
  /** Reference to the table */
  innerRef?: (ref: React.RefObject<any>) => void;
  /** Filters that are added to the filterbar by default */
  defaultFilters: Array<Filter>;
} & ManagedTableProps &
  SearchableProps;

type State = {
  filterRows: (row: TableBodyRow) => boolean;
};

const rowMatchesFilters = (filters: Array<Filter>, row: TableBodyRow) =>
  filters
    .map((filter: Filter) => {
      if (filter.type === 'enum' && row.type != null) {
        return filter.value.length === 0 || filter.value.indexOf(row.type) > -1;
      }
      // Check if there is column name and value in case of mistyping.
      if (
        row.columns[filter.key] === undefined ||
        row.columns[filter.key].value === undefined
      ) {
        return false;
      }
      if (filter.type === 'include') {
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
    .every((x) => x === true);

function rowMatchesRegex(values: Array<string>, regex: string): boolean {
  try {
    const re = new RegExp(regex);
    return values.some((x) => re.test(x));
  } catch (e) {
    return false;
  }
}

function rowMatchesSearchTerm(
  searchTerm: string,
  isRegex: boolean,
  isBodySearchEnabled: boolean,
  row: TableBodyRow,
): boolean {
  if (searchTerm == null || searchTerm.length === 0) {
    return true;
  }
  const rowValues = Object.keys(row.columns).map((key) =>
    textContent(row.columns[key].value),
  );
  if (isBodySearchEnabled) {
    if (row.requestBody) {
      rowValues.push(row.requestBody);
    }
    if (row.responseBody) {
      rowValues.push(row.responseBody);
    }
  }
  if (row.filterValue != null) {
    rowValues.push(row.filterValue);
  }
  if (isRegex) {
    return rowMatchesRegex(rowValues, searchTerm);
  }
  return rowValues.some((x) =>
    x.toLowerCase().includes(searchTerm.toLowerCase()),
  );
}

const filterRowsFactory = (
  filters: Array<Filter>,
  searchTerm: string,
  regexSearch: boolean,
  bodySearch: boolean,
) => (row: TableBodyRow): boolean =>
  rowMatchesFilters(filters, row) &&
  rowMatchesSearchTerm(searchTerm, regexSearch, bodySearch, row);

class SearchableManagedTable extends PureComponent<Props, State> {
  static defaultProps = {
    defaultFilters: [],
  };

  state = {
    filterRows: filterRowsFactory(
      this.props.filters,
      this.props.searchTerm,
      this.props.regexEnabled || false,
      this.props.bodySearchEnabled || false,
    ),
  };

  componentDidMount() {
    this.props.defaultFilters.map(this.props.addFilter);
  }

  UNSAFE_componentWillReceiveProps(nextProps: Props) {
    if (
      nextProps.searchTerm !== this.props.searchTerm ||
      nextProps.regexEnabled != this.props.regexEnabled ||
      nextProps.bodySearchEnabled != this.props.bodySearchEnabled ||
      !deepEqual(this.props.filters, nextProps.filters)
    ) {
      this.setState({
        filterRows: filterRowsFactory(
          nextProps.filters,
          nextProps.searchTerm,
          nextProps.regexEnabled || false,
          nextProps.bodySearchEnabled || false,
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
      <ManagedTable
        {...props}
        filter={this.state.filterRows}
        rows={rows.filter(this.state.filterRows)}
        onAddFilter={addFilter}
        innerRef={innerRef}
      />
    );
  }
}

/**
 * Table with filter and searchbar, supports all properties a ManagedTable
 * and Searchable supports.
 */
export default Searchable(SearchableManagedTable);

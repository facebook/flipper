/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {ManagedTableProps, TableBodyRow, Filter} from 'sonar';
import type {SearchableProps} from './Searchable.js';
import {PureComponent} from 'react';
import ManagedTable from '../table/ManagedTable.js';

import textContent from '../../../utils/textContent.js';
import Searchable from './Searchable.js';
import deepEqual from 'deep-equal';

type Props = {|
  ...ManagedTableProps,
  ...SearchableProps,
  innerRef?: (ref: React.ElementRef<*>) => void,
  defaultFilters: Array<Filter>,
  filter: empty,
  filterValue: empty,
|};

type State = {
  filterRows: (row: TableBodyRow) => boolean,
};

const filterRowsFactory = (filters: Array<Filter>, searchTerm: string) => (
  row: TableBodyRow,
): boolean =>
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
    .reduce((acc, cv) => acc && cv, true) &&
  (searchTerm != null && searchTerm.length > 0
    ? Object.keys(row.columns)
        .map(key => textContent(row.columns[key].value))
        .join('~~') // prevent from matching text spanning multiple columns
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    : true);

class SearchableManagedTable extends PureComponent<Props, State> {
  static defaultProps = {
    defaultFilters: [],
  };

  state = {
    filterRows: filterRowsFactory(this.props.filters, this.props.searchTerm),
  };

  componentDidMount() {
    this.props.defaultFilters.map(this.props.addFilter);
  }

  componentWillReceiveProps(nextProps: Props) {
    // ManagedTable is a PureComponent and does not update when this.filterRows
    // would return a different value. This is why we update the funtion reference
    // once the results of the function changed.
    if (
      nextProps.searchTerm !== this.props.searchTerm ||
      !deepEqual(this.props.filters, nextProps.filters)
    ) {
      this.setState({
        filterRows: filterRowsFactory(nextProps.filters, nextProps.searchTerm),
      });
    }
  }

  render() {
    const {
      addFilter,
      searchTerm: _searchTerm,
      filters: _filters,
      innerRef,
      ...props
    } = this.props;
    return (
      // $FlowFixMe
      <ManagedTable
        {...props}
        filter={this.state.filterRows}
        onAddFilter={addFilter}
        ref={innerRef}
      />
    );
  }
}

export default Searchable(SearchableManagedTable);

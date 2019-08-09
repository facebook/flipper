/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {
  ManagedDataInspector,
  Panel,
  colors,
  styled,
  Text,
  Toolbar,
  Spacer,
  Button,
  Select,
} from 'flipper';
import ErrorBlock from '../ui/components/ErrorBlock';
import FlexColumn from '../ui/components/FlexColumn';
import DetailSidebar from '../chrome/DetailSidebar';
import {FlipperPlugin} from '../plugin.tsx';
import SearchableTable from '../ui/components/searchable/SearchableTable';
import textContent from '../utils/textContent.js';
import createPaste from '../fb-stubs/createPaste.tsx';

import type {Node} from 'react';
import type {
  TableHighlightedRows,
  TableRows,
  TableColumnSizes,
  TableColumns,
  TableColumnOrderVal,
  TableBodyRow,
} from 'flipper';

type ID = string;

type TableMetadata = {
  topToolbar?: ToolbarSection,
  bottomToolbar?: ToolbarSection,
  columns: TableColumns,
  columnSizes?: TableColumnSizes,
  columnOrder?: Array<TableColumnOrderVal>,
  filterableColumns?: Set<string>,
};

type PersistedState = {|
  rows: TableRows,
  datas: {[key: ID]: NumberedRowData},
  tableMetadata: ?TableMetadata,
|};

type State = {|
  selectedIds: Array<ID>,
  error: ?string,
|};

type RowData = {
  id: string,
  columns: {[key: string]: any},
  sidebar?: Array<SidebarSection>,
};

type NumberedRowData = {
  id: string,
  columns: {[key: string]: any},
  sidebar?: Array<SidebarSection>,
  rowNumber: number,
};

type SidebarSection = JsonSection | ToolbarSection;
type JsonSection = {
  type: 'json',
  title: string,
  content: string,
};
type ToolbarSection = {
  type: 'toolbar',
  items: Array<ToolbarItem>,
};
type ToolbarItem =
  | {type: 'link', destination: string, label: string}
  | {
      type: 'input',
      inputType: 'select',
      id: string,
      label: string,
      options: Array<string>,
      value: string,
    };

const NonWrappingText = styled(Text)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  userSelect: 'none',
});

const BooleanValue = styled(NonWrappingText)(props => ({
  '&::before': {
    content: '""',
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: props.active ? colors.green : colors.red,
    marginRight: 5,
    marginTop: 1,
  },
}));

const Label = styled('Span')({
  fontSize: 12,
  color: '#90949c',
  fontWeight: 'bold',
  textTransform: 'uppercase',
  marginLeft: 5,
  marginRight: 12,
});

function renderValue({type, value}: {type: string, value: any}) {
  switch (type) {
    case 'boolean':
      return (
        <BooleanValue code={true} active={value}>
          {value.toString()}
        </BooleanValue>
      );
    default:
      return value;
  }
}

function buildRow(rowData: RowData, previousRowData: ?RowData): TableBodyRow {
  if (!rowData.columns) {
    throw new Error('defaultBuildRow used with incorrect data format.');
  }
  const oldColumns =
    previousRowData && previousRowData.columns
      ? Object.keys(previousRowData.columns).reduce((map, key) => {
          if (key !== 'id') {
            map[key] = {
              value: (previousRowData?.columns || {})[key].value,
              isFilterable: true,
            };
          }
          return map;
        }, {})
      : {};
  const columns = Object.keys(rowData.columns).reduce((map, key) => {
    if (rowData.columns && key !== 'id') {
      const renderedValue = renderValue(rowData.columns[key]);
      map[key] = {
        value: renderedValue,
        isFilterable: true,
      };
    }
    return map;
  }, oldColumns);
  return {
    columns,
    key: rowData.id,
    copyText: JSON.stringify(rowData),
    filterValue: rowData.id,
  };
}

function renderToolbar(section: ToolbarSection) {
  const toolbarComponents = section.items.map((item, index) => {
    switch (item.type) {
      case 'link':
        return (
          <Button href={item.destination} key={index + 1}>
            {item.label}
          </Button>
        );
      case 'input':
        return [
          <Label>{item.label}</Label>,
          <Select
            options={item.options.reduce((obj, item) => {
              obj[item] = item;
              return obj;
            }, {})}
            value={item.value}
            onChange={() => {}}
          />,
        ];
    }
  });
  return (
    <Toolbar key="toolbar">
      <Spacer key={0} />
      {toolbarComponents}
    </Toolbar>
  );
}

function renderSidebarForRow(rowData: RowData): Node {
  if (!rowData.sidebar) {
    return null;
  }
  if (!Array.isArray(rowData.sidebar)) {
    throw new Error('typeof rowData.sidebar is not array as expected: ');
  }
  return rowData.sidebar.map(renderSidebarSection);
}

function renderSidebarSection(section: SidebarSection, index: number): Node {
  switch (section.type) {
    case 'json':
      return (
        <Panel floating={false} heading={section.title} key={index}>
          <ManagedDataInspector data={section.content} expandRoot={true} />
        </Panel>
      );
    case 'toolbar':
      return renderToolbar(section);
    default:
      return (
        <Panel floating={false} heading={'Details'} key={index}>
          <ManagedDataInspector data={section} expandRoot={true} />
        </Panel>
      );
  }
}

type IncomingMessage =
  | {method: 'updateRows', data: Array<RowData>}
  | {method: 'clearTable'};

export default function createTableNativePlugin(id: string, title: string) {
  return class extends FlipperPlugin<State, *, PersistedState> {
    static keyboardActions = ['clear', 'createPaste'];
    static id = id || '';
    static title = title || '';

    static defaultPersistedState: PersistedState = {
      rows: [],
      datas: {},
      tableMetadata: null,
    };

    static typedPersistedStateReducer = (
      persistedState: PersistedState,
      message: IncomingMessage,
    ): $Shape<PersistedState> => {
      if (message.method === 'updateRows') {
        const newRows = [];
        const newData = {};

        for (const rowData of message.data.reverse()) {
          if (rowData.id == null) {
            throw new Error(
              `updateRows: row is missing id: ${JSON.stringify(rowData)}`,
            );
          }
          const previousRowData: ?NumberedRowData =
            persistedState.datas[rowData.id];
          const newRow: TableBodyRow = buildRow(rowData, previousRowData);
          if (persistedState.datas[rowData.id] == null) {
            newData[rowData.id] = {
              ...rowData,
              rowNumber: persistedState.rows.length + newRows.length,
            };
            newRows.push(newRow);
          } else {
            persistedState.rows = persistedState.rows
              .slice(0, persistedState.datas[rowData.id].rowNumber)
              .concat(
                [newRow],
                persistedState.rows.slice(
                  persistedState.datas[rowData.id].rowNumber + 1,
                ),
              );
          }
        }
        return {
          ...persistedState,
          datas: {...persistedState.datas, ...newData},
          rows: [...persistedState.rows, ...newRows],
        };
      } else if (message.method === 'clearTable') {
        return {
          ...persistedState,
          rows: [],
          datas: {},
        };
      } else {
        return {};
      }
    };

    static persistedStateReducer = (
      persistedState: PersistedState,
      method: string,
      data: any,
    ): $Shape<PersistedState> => {
      // $FlowFixMe Unsafely treat the recieved message as what we're expecting.
      return this.typedPersistedStateReducer(persistedState, {method, data});
    };

    state = {
      selectedIds: [],
      error: null,
    };

    init() {
      this.getTableMetadata();
    }

    getTableMetadata = () => {
      if (!this.props.persistedState.tableMetadata) {
        this.client
          .call('getMetadata')
          .then(metadata => {
            this.props.setPersistedState({
              tableMetadata: {
                ...metadata,
                filterableColumns: new Set(metadata.filterableColumns),
              },
            });
          })
          .catch(e => this.setState({error: e}));
      }
    };

    onKeyboardAction = (action: string) => {
      if (action === 'clear') {
        this.clear();
      } else if (action === 'createPaste') {
        this.createPaste();
      }
    };

    clear = () => {
      this.props.setPersistedState({
        rows: [],
        datas: {},
      });
      this.setState({
        selectedIds: [],
      });
    };

    createPaste = () => {
      if (!this.props.persistedState.tableMetadata) {
        return;
      }
      let paste = '';
      const mapFn = row =>
        (
          (this.props.persistedState.tableMetadata &&
            Object.keys(this.props.persistedState.tableMetadata.columns)) ||
          []
        )
          .map(key => textContent(row.columns[key].value))
          .join('\t');

      if (this.state.selectedIds.length > 0) {
        // create paste from selection
        paste = this.props.persistedState.rows
          .filter(row => this.state.selectedIds.indexOf(row.key) > -1)
          .map(mapFn)
          .join('\n');
      } else {
        // create paste with all rows
        paste = this.props.persistedState.rows.map(mapFn).join('\n');
      }
      createPaste(paste);
    };

    onRowHighlighted = (keys: TableHighlightedRows) => {
      this.setState({
        selectedIds: keys,
      });
    };

    // We don't necessarily have the table metadata at the time when buildRow
    // is being used. This includes presentation layer info like which
    // columns should be filterable. This does a pass over the built rows and
    // applies that presentation layer information.
    applyMetadataToRows(rows: TableRows): TableRows {
      if (!this.props.persistedState.tableMetadata) {
        console.error(
          'applyMetadataToRows called without tableMetadata present',
        );
        return rows;
      }
      return rows.map(r => {
        return {
          ...r,
          columns: Object.keys(r.columns).reduce((map, columnName) => {
            map[columnName].isFilterable =
              this.props.persistedState.tableMetadata &&
              this.props.persistedState.tableMetadata.filterableColumns
                ? this.props.persistedState.tableMetadata.filterableColumns.has(
                    columnName,
                  )
                : false;
            return map;
          }, r.columns),
        };
      });
    }

    renderSidebar = () => {
      const {selectedIds} = this.state;
      const {datas} = this.props.persistedState;
      const selectedId = selectedIds.length !== 1 ? null : selectedIds[0];

      if (selectedId != null) {
        return renderSidebarForRow(datas[selectedId]);
      } else {
        return null;
      }
    };

    render() {
      if (this.state.error) {
        return <ErrorBlock error={this.state.error} />;
      }
      if (!this.props.persistedState.tableMetadata) {
        return 'Loading...';
      }
      const {
        topToolbar,
        bottomToolbar,
        columns,
        columnSizes,
        columnOrder,
      } = this.props.persistedState.tableMetadata;
      const {rows} = this.props.persistedState;

      const topToolbarComponent = topToolbar ? renderToolbar(topToolbar) : null;
      const bottomToolbarComponent = bottomToolbar
        ? renderToolbar(bottomToolbar)
        : null;

      return (
        <FlexColumn grow={true}>
          {topToolbarComponent}
          <SearchableTable
            key={this.constructor.id}
            rowLineHeight={28}
            floating={false}
            multiline={true}
            columnSizes={columnSizes}
            columnOrder={columnOrder}
            columns={columns}
            onRowHighlighted={this.onRowHighlighted}
            multiHighlight={true}
            rows={this.applyMetadataToRows(rows)}
            stickyBottom={true}
            actions={<Button onClick={this.clear}>Clear Table</Button>}
          />
          <DetailSidebar>{this.renderSidebar()}</DetailSidebar>
          {bottomToolbarComponent}
        </FlexColumn>
      );
    }
  };
}

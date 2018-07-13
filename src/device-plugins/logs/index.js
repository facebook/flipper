/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {
  TableBodyRow,
  TableColumnOrder,
  TableColumnSizes,
  TableColumns,
} from 'sonar';
import type {Counter} from './LogWatcher.js';
import type {DeviceLogEntry} from '../../devices/BaseDevice.js';

import {
  Text,
  ManagedTable,
  Button,
  colors,
  FlexCenter,
  LoadingIndicator,
  ContextMenu,
  FlexColumn,
  Glyph,
} from 'sonar';
import {SonarDevicePlugin, SearchableTable} from 'sonar';
import textContent from '../../utils/textContent.js';
import createPaste from '../../utils/createPaste.js';
import LogWatcher from './LogWatcher';

const LOG_WATCHER_LOCAL_STORAGE_KEY = 'LOG_WATCHER_LOCAL_STORAGE_KEY';

type Entries = Array<{
  row: TableBodyRow,
  entry: DeviceLogEntry,
}>;

type LogsState = {|
  initialising: boolean,
  rows: Array<TableBodyRow>,
  entries: Entries,
  key2entry: {[key: string]: DeviceLogEntry},
  highlightedRows: Array<string>,
  counters: Array<Counter>,
|};

const Icon = Glyph.extends({
  marginTop: 5,
});

function getLineCount(str: string): number {
  let count = 1;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '\n') {
      count++;
    }
  }
  return count;
}

function keepKeys(obj, keys) {
  const result = {};
  for (const key in obj) {
    if (keys.includes(key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

const COLUMN_SIZE = {
  type: 32,
  time: 120,
  pid: 60,
  tid: 60,
  tag: 120,
  app: 200,
  message: 'flex',
};

const COLUMNS = {
  type: {
    value: '',
  },
  time: {
    value: 'Time',
  },
  pid: {
    value: 'PID',
  },
  tid: {
    value: 'TID',
  },
  tag: {
    value: 'Tag',
  },
  app: {
    value: 'App',
  },
  message: {
    value: 'Message',
  },
};

const INITIAL_COLUMN_ORDER = [
  {
    key: 'type',
    visible: true,
  },
  {
    key: 'time',
    visible: false,
  },
  {
    key: 'pid',
    visible: false,
  },
  {
    key: 'tid',
    visible: false,
  },
  {
    key: 'tag',
    visible: true,
  },
  {
    key: 'app',
    visible: true,
  },
  {
    key: 'message',
    visible: true,
  },
];

const LOG_TYPES: {
  [level: string]: {
    label: string,
    color: string,
    icon?: React.Node,
    style?: Object,
  },
} = {
  verbose: {
    label: 'Verbose',
    color: colors.purple,
  },
  debug: {
    label: 'Debug',
    color: colors.grey,
  },
  info: {
    label: 'Info',
    icon: <Icon name="info-circle" color={colors.cyan} />,
    color: colors.cyan,
  },
  warn: {
    label: 'Warn',
    style: {
      backgroundColor: colors.yellowTint,
      color: colors.yellow,
      fontWeight: 500,
    },
    icon: <Icon name="caution-triangle" color={colors.yellow} />,
    color: colors.yellow,
  },
  error: {
    label: 'Error',
    style: {
      backgroundColor: colors.redTint,
      color: colors.red,
      fontWeight: 500,
    },
    icon: <Icon name="caution-octagon" color={colors.red} />,
    color: colors.red,
  },
  fatal: {
    label: 'Fatal',
    style: {
      backgroundColor: colors.redTint,
      color: colors.red,
      fontWeight: 700,
    },
    icon: <Icon name="stop" color={colors.red} />,
    color: colors.red,
  },
};

const DEFAULT_FILTERS = [
  {
    type: 'enum',
    enum: Object.keys(LOG_TYPES).map(value => ({
      label: LOG_TYPES[value].label,
      value,
    })),
    key: 'type',
    value: [],
    persistent: true,
  },
];

const NonSelectableText = Text.extends({
  alignSelf: 'baseline',
  userSelect: 'none',
  lineHeight: '130%',
  marginTop: 6,
});

const LogCount = NonSelectableText.extends(
  {
    backgroundColor: props => props.color,
    borderRadius: '999em',
    fontSize: 11,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    width: 16,
    height: 16,
    color: colors.white,
  },
  {
    ignoreAttributes: ['color'],
  },
);

const HiddenScrollText = NonSelectableText.extends({
  '&::-webkit-scrollbar': {
    display: 'none',
  },
});

function pad(chunk: mixed, len: number): string {
  let str = String(chunk);
  while (str.length < len) {
    str = `0${str}`;
  }
  return str;
}

export default class LogTable extends SonarDevicePlugin<LogsState> {
  static id = 'DeviceLogs';
  static title = 'Logs';
  static icon = 'arrow-right';
  static keyboardActions = ['clear', 'goToBottom', 'createPaste'];

  onKeyboardAction = (action: string) => {
    if (action === 'clear') {
      this.clearLogs();
    } else if (action === 'goToBottom') {
      this.goToBottom();
    } else if (action === 'createPaste') {
      this.createPaste();
    }
  };

  restoreSavedCounters = (): Array<Counter> => {
    const savedCounters =
      window.localStorage.getItem(LOG_WATCHER_LOCAL_STORAGE_KEY) || '[]';
    return JSON.parse(savedCounters).map((counter: Counter) => ({
      ...counter,
      expression: new RegExp(counter.label, 'gi'),
      count: 0,
    }));
  };

  state = {
    rows: [],
    entries: [],
    key2entry: {},
    initialising: true,
    highlightedRows: [],
    counters: this.restoreSavedCounters(),
  };

  tableRef: ?ManagedTable;
  columns: TableColumns;
  columnSizes: TableColumnSizes;
  columnOrder: TableColumnOrder;

  init() {
    let batch: Entries = [];
    let queued = false;
    let counter = 0;

    const supportedColumns = this.device.supportedColumns();
    this.columns = keepKeys(COLUMNS, supportedColumns);
    this.columnSizes = keepKeys(COLUMN_SIZE, supportedColumns);
    this.columnOrder = INITIAL_COLUMN_ORDER.filter(obj =>
      supportedColumns.includes(obj.key),
    );

    this.device.addLogListener((entry: DeviceLogEntry) => {
      const {icon, style} =
        LOG_TYPES[(entry.type: string)] || LOG_TYPES.verbose;

      // clean message
      const message = entry.message.trim();
      entry.type === 'error';

      let counterUpdated = false;
      const counters = this.state.counters.map(counter => {
        if (message.match(counter.expression)) {
          counterUpdated = true;
          if (counter.notify) {
            new window.Notification(`${counter.label}`, {
              body: 'The watched log message appeared',
            });
          }
          return {
            ...counter,
            count: counter.count + 1,
          };
        } else {
          return counter;
        }
      });
      if (counterUpdated) {
        this.setState({counters});
      }

      // build the item, it will either be batched or added straight away
      const item = {
        entry,
        row: {
          columns: {
            type: {
              value: icon,
            },
            time: {
              value: (
                <HiddenScrollText code={true}>
                  {entry.date.toTimeString().split(' ')[0] +
                    '.' +
                    pad(entry.date.getMilliseconds(), 3)}
                </HiddenScrollText>
              ),
            },
            message: {
              value: <HiddenScrollText code={true}>{message}</HiddenScrollText>,
            },
            tag: {
              value: (
                <NonSelectableText code={true}>{entry.tag}</NonSelectableText>
              ),
              isFilterable: true,
            },
            pid: {
              value: (
                <NonSelectableText code={true}>
                  {String(entry.pid)}
                </NonSelectableText>
              ),
              isFilterable: true,
            },
            tid: {
              value: (
                <NonSelectableText code={true}>
                  {String(entry.tid)}
                </NonSelectableText>
              ),
              isFilterable: true,
            },
            app: {
              value: (
                <NonSelectableText code={true}>{entry.app}</NonSelectableText>
              ),
              isFilterable: true,
            },
          },
          height: getLineCount(message) * 15 + 10, // 15px per line height + 8px padding
          style,
          type: entry.type,
          filterValue: entry.message,
          key: String(counter++),
        },
      };

      // batch up logs to be processed every 250ms, if we have lots of log
      // messages coming in, then calling an setState 200+ times is actually
      // pretty expensive
      batch.push(item);

      if (!queued) {
        queued = true;

        setTimeout(() => {
          const thisBatch = batch;
          batch = [];
          queued = false;

          // update rows/entries
          this.setState(state => {
            const rows = [...state.rows];
            const entries = [...state.entries];
            const key2entry = {...state.key2entry};

            for (let i = 0; i < thisBatch.length; i++) {
              const {entry, row} = thisBatch[i];
              entries.push({row, entry});
              key2entry[row.key] = entry;

              let previousEntry: ?DeviceLogEntry = null;

              if (i > 0) {
                previousEntry = thisBatch[i - 1].entry;
              } else if (state.rows.length > 0 && state.entries.length > 0) {
                previousEntry = state.entries[state.entries.length - 1].entry;
              }

              this.addRowIfNeeded(rows, row, entry, previousEntry);
            }

            return {
              entries,
              rows,
              key2entry,
            };
          });
        }, 100);
      }
    });

    setTimeout(() => {
      this.setState({
        initialising: false,
      });
    }, 2000);
  }

  addRowIfNeeded(
    rows: Array<TableBodyRow>,
    row: TableBodyRow,
    entry: DeviceLogEntry,
    previousEntry: ?DeviceLogEntry,
  ) {
    const previousRow = rows.length > 0 ? rows[rows.length - 1] : null;
    if (
      previousRow &&
      previousEntry &&
      entry.message === previousEntry.message &&
      entry.tag === previousEntry.tag &&
      previousRow.type != null
    ) {
      const count = (previousRow.columns.time.value.props.count || 1) + 1;
      previousRow.columns.type.value = (
        <LogCount color={LOG_TYPES[previousRow.type].color}>{count}</LogCount>
      );
    } else {
      rows.push(row);
    }
  }

  clearLogs = () => {
    this.setState({
      entries: [],
      rows: [],
      highlightedRows: [],
      key2entry: {},
      counters: this.state.counters.map(counter => ({
        ...counter,
        count: 0,
      })),
    });
  };

  createPaste = () => {
    let paste = '';
    const mapFn = row =>
      Object.keys(COLUMNS)
        .map(key => textContent(row.columns[key].value))
        .join('\t');

    if (this.state.highlightedRows.length > 0) {
      // create paste from selection
      paste = this.state.rows
        .filter(row => this.state.highlightedRows.indexOf(row.key) > -1)
        .map(mapFn)
        .join('\n');
    } else {
      // create paste with all rows
      paste = this.state.rows.map(mapFn).join('\n');
    }
    createPaste(paste);
  };

  setTableRef = (ref: React.ElementRef<typeof ManagedTable>) => {
    this.tableRef = ref;
  };

  goToBottom = () => {
    if (this.tableRef != null) {
      this.tableRef.scrollToBottom();
    }
  };

  onRowHighlighted = (highlightedRows: Array<string>) => {
    this.setState({
      ...this.state,
      highlightedRows,
    });
  };

  renderSidebar = () => {
    return (
      <LogWatcher
        counters={this.state.counters}
        onChange={counters =>
          this.setState({counters}, () =>
            window.localStorage.setItem(
              LOG_WATCHER_LOCAL_STORAGE_KEY,
              JSON.stringify(this.state.counters),
            ),
          )
        }
      />
    );
  };

  static ContextMenu = ContextMenu.extends({
    flex: 1,
  });

  render() {
    const {initialising, rows} = this.state;

    const contextMenuItems = [
      {
        type: 'separator',
      },
      {
        label: 'Clear all',
        click: this.clearLogs,
      },
    ];
    return initialising ? (
      <FlexCenter fill={true}>
        <LoadingIndicator />
      </FlexCenter>
    ) : (
      <LogTable.ContextMenu items={contextMenuItems} component={FlexColumn}>
        <SearchableTable
          innerRef={this.setTableRef}
          floating={false}
          multiline={true}
          columnSizes={this.columnSizes}
          columnOrder={this.columnOrder}
          columns={this.columns}
          rows={rows}
          onRowHighlighted={this.onRowHighlighted}
          multiHighlight={true}
          defaultFilters={DEFAULT_FILTERS}
          zebra={false}
          actions={<Button onClick={this.clearLogs}>Clear Logs</Button>}
          stickyBottom={true}
        />
      </LogTable.ContextMenu>
    );
  }
}

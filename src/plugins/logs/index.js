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
} from 'flipper';
import type {Counter} from './LogWatcher.js';
import type {DeviceLogEntry} from '../../devices/BaseDevice.js';
import type {Props as PluginProps} from '../../plugin';

import {
  Text,
  ManagedTable,
  Button,
  colors,
  ContextMenu,
  FlexColumn,
  Glyph,
  DetailSidebar,
  FlipperDevicePlugin,
  SearchableTable,
  styled,
  Device,
  createPaste,
  textContent,
} from 'flipper';
import LogWatcher from './LogWatcher';

const LOG_WATCHER_LOCAL_STORAGE_KEY = 'LOG_WATCHER_LOCAL_STORAGE_KEY';

type Entries = Array<{
  row: TableBodyRow,
  entry: DeviceLogEntry,
}>;

type State = {|
  rows: Array<TableBodyRow>,
  entries: Entries,
  key2entry: {[key: string]: DeviceLogEntry},
  highlightedRows: Set<string>,
  counters: Array<Counter>,
|};

type Actions = {||};

type PersistedState = {||};

const Icon = styled(Glyph)({
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
  type: 40,
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

const HiddenScrollText = styled(Text)({
  alignSelf: 'baseline',
  userSelect: 'none',
  lineHeight: '130%',
  marginTop: 5,
  paddingBottom: 3,
  '&::-webkit-scrollbar': {
    display: 'none',
  },
});

const LogCount = styled('div')(({backgroundColor}) => ({
  backgroundColor,
  borderRadius: '999em',
  fontSize: 11,
  marginTop: 4,
  minWidth: 16,
  height: 16,
  color: colors.white,
  textAlign: 'center',
  lineHeight: '16px',
  paddingLeft: 4,
  paddingRight: 4,
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
}));

function pad(chunk: mixed, len: number): string {
  let str = String(chunk);
  while (str.length < len) {
    str = `0${str}`;
  }
  return str;
}

export function addEntriesToState(
  items: Entries,
  state: $Shape<State> = {
    rows: [],
    entries: [],
    key2entry: {},
  },
): $Shape<State> {
  const rows = [...state.rows];
  const entries = [...state.entries];
  const key2entry = {...state.key2entry};

  for (let i = 0; i < items.length; i++) {
    const {entry, row} = items[i];
    entries.push({row, entry});
    key2entry[row.key] = entry;

    let previousEntry: ?DeviceLogEntry = null;

    if (i > 0) {
      previousEntry = items[i - 1].entry;
    } else if (state.rows.length > 0 && state.entries.length > 0) {
      previousEntry = state.entries[state.entries.length - 1].entry;
    }

    addRowIfNeeded(rows, row, entry, previousEntry);
  }

  return {
    entries,
    rows,
    key2entry,
  };
}

export function addRowIfNeeded(
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
    // duplicate log, increase counter
    const count =
      previousRow.columns.type.value &&
      previousRow.columns.type.value.props &&
      typeof previousRow.columns.type.value.props.children === 'number'
        ? previousRow.columns.type.value.props.children + 1
        : 2;
    const type = LOG_TYPES[previousRow.type] || LOG_TYPES.debug;
    previousRow.columns.type.value = (
      <LogCount backgroundColor={type.color}>{count}</LogCount>
    );
  } else {
    rows.push(row);
  }
}

export function processEntry(
  entry: DeviceLogEntry,
  key: string,
): {
  row: TableBodyRow,
  entry: DeviceLogEntry,
} {
  const {icon, style} = LOG_TYPES[(entry.type: string)] || LOG_TYPES.debug;

  // build the item, it will either be batched or added straight away
  return {
    entry,
    row: {
      columns: {
        type: {
          value: icon,
          align: 'center',
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
          value: (
            <HiddenScrollText code={true}>{entry.message}</HiddenScrollText>
          ),
        },
        tag: {
          value: <HiddenScrollText code={true}>{entry.tag}</HiddenScrollText>,
          isFilterable: true,
        },
        pid: {
          value: (
            <HiddenScrollText code={true}>{String(entry.pid)}</HiddenScrollText>
          ),
          isFilterable: true,
        },
        tid: {
          value: (
            <HiddenScrollText code={true}>{String(entry.tid)}</HiddenScrollText>
          ),
          isFilterable: true,
        },
        app: {
          value: <HiddenScrollText code={true}>{entry.app}</HiddenScrollText>,
          isFilterable: true,
        },
      },
      height: getLineCount(entry.message) * 15 + 10, // 15px per line height + 8px padding
      style,
      type: entry.type,
      filterValue: entry.message,
      key,
    },
  };
}

export default class LogTable extends FlipperDevicePlugin<
  State,
  Actions,
  PersistedState,
> {
  static keyboardActions = ['clear', 'goToBottom', 'createPaste'];

  initTimer: ?TimeoutID;
  batchTimer: ?TimeoutID;

  static supportsDevice(device: Device) {
    return device.os === 'iOS' || device.os === 'Android';
  }

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

  calculateHighlightedRows = (
    deepLinkPayload: ?string,
    rows: Array<TableBodyRow>,
  ): Set<string> => {
    const highlightedRows = new Set();
    if (!deepLinkPayload) {
      return highlightedRows;
    }

    // Run through array from last to first, because we want to show the last
    // time it the log we are looking for appeared.
    for (let i = rows.length - 1; i >= 0; i--) {
      if (
        rows[i].filterValue &&
        rows[i].filterValue.includes(deepLinkPayload)
      ) {
        highlightedRows.add(rows[i].key);
        break;
      }
    }
    return highlightedRows;
  };

  tableRef: ?ManagedTable;
  columns: TableColumns;
  columnSizes: TableColumnSizes;
  columnOrder: TableColumnOrder;
  logListener: ?Symbol;

  batch: Entries = [];
  queued: boolean = false;
  counter: number = 0;

  constructor(props: PluginProps<PersistedState>) {
    super(props);
    const supportedColumns = this.device.supportedColumns();
    this.columns = keepKeys(COLUMNS, supportedColumns);
    this.columnSizes = keepKeys(COLUMN_SIZE, supportedColumns);
    this.columnOrder = INITIAL_COLUMN_ORDER.filter(obj =>
      supportedColumns.includes(obj.key),
    );

    const initialState = addEntriesToState(
      this.device
        .getLogs()
        .map(log => processEntry(log, String(this.counter++))),
    );
    this.state = {
      ...initialState,
      highlightedRows: this.calculateHighlightedRows(
        props.deepLinkPayload,
        initialState.rows,
      ),
      counters: this.restoreSavedCounters(),
    };

    this.logListener = this.device.addLogListener((entry: DeviceLogEntry) => {
      const processedEntry = processEntry(entry, String(this.counter++));
      this.incrementCounterIfNeeded(processedEntry.entry);
      this.scheudleEntryForBatch(processedEntry);
    });
  }

  incrementCounterIfNeeded = (entry: DeviceLogEntry) => {
    let counterUpdated = false;
    const counters = this.state.counters.map(counter => {
      if (entry.message.match(counter.expression)) {
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
  };

  scheudleEntryForBatch = (item: {
    row: TableBodyRow,
    entry: DeviceLogEntry,
  }) => {
    // batch up logs to be processed every 250ms, if we have lots of log
    // messages coming in, then calling an setState 200+ times is actually
    // pretty expensive
    this.batch.push(item);

    if (!this.queued) {
      this.queued = true;

      this.batchTimer = setTimeout(() => {
        const thisBatch = this.batch;
        this.batch = [];
        this.queued = false;
        this.setState(state => addEntriesToState(thisBatch, state));
      }, 100);
    }
  };

  componentWillUnmount() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    if (this.logListener) {
      this.device.removeLogListener(this.logListener);
    }
  }

  clearLogs = () => {
    this.setState({
      entries: [],
      rows: [],
      highlightedRows: new Set(),
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

    if (this.state.highlightedRows.size > 0) {
      // create paste from selection
      paste = this.state.rows
        .filter(row => this.state.highlightedRows.has(row.key))
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
      highlightedRows: new Set(highlightedRows),
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

  static ContextMenu = styled(ContextMenu)({
    flex: 1,
  });

  buildContextMenuItems = () => [
    {
      type: 'separator',
    },
    {
      label: 'Clear all',
      click: this.clearLogs,
    },
  ];

  render() {
    return (
      <LogTable.ContextMenu
        buildItems={this.buildContextMenuItems}
        component={FlexColumn}>
        <SearchableTable
          innerRef={this.setTableRef}
          floating={false}
          multiline={true}
          columnSizes={this.columnSizes}
          columnOrder={this.columnOrder}
          columns={this.columns}
          rows={this.state.rows}
          highlightedRows={this.state.highlightedRows}
          onRowHighlighted={this.onRowHighlighted}
          multiHighlight={true}
          defaultFilters={DEFAULT_FILTERS}
          zebra={false}
          actions={<Button onClick={this.clearLogs}>Clear Logs</Button>}
          // If the logs is opened through deeplink, then don't scroll as the row is highlighted
          stickyBottom={
            !(this.props.deepLinkPayload && this.state.highlightedRows.size > 0)
          }
        />
        <DetailSidebar>{this.renderSidebar()}</DetailSidebar>
      </LogTable.ContextMenu>
    );
  }
}

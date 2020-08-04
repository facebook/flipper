/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  TableBodyRow,
  TableColumnOrder,
  TableColumnSizes,
  TableColumns,
  TableRowSortOrder,
  Props as PluginProps,
  BaseAction,
  DeviceLogEntry,
  produce,
} from 'flipper';
import {Counter} from './LogWatcher';

import {
  Text,
  ManagedTableClass,
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
  KeyboardActions,
  MenuTemplate,
} from 'flipper';
import LogWatcher from './LogWatcher';
import React from 'react';

const LOG_WATCHER_LOCAL_STORAGE_KEY = 'LOG_WATCHER_LOCAL_STORAGE_KEY';

type Entries = ReadonlyArray<{
  readonly row: TableBodyRow;
  readonly entry: DeviceLogEntry;
}>;

type BaseState = {
  readonly rows: ReadonlyArray<TableBodyRow>;
  readonly entries: Entries;
};

type AdditionalState = {
  readonly highlightedRows: ReadonlySet<string>;
  readonly counters: ReadonlyArray<Counter>;
  readonly timeDirection: 'up' | 'down';
};

type State = BaseState & AdditionalState;

type PersistedState = {};

const Icon = styled(Glyph)({
  marginTop: 5,
});

function getLineCount(str: string): number {
  let count = 1;
  if (!(typeof str === 'string')) {
    return 0;
  }
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '\n') {
      count++;
    }
  }
  return count;
}

function keepKeys<A>(obj: A, keys: Array<string>): A {
  const result: A = {} as A;
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
} as const;

const COLUMNS = {
  type: {
    value: '',
  },
  time: {
    value: 'Time',
    sortable: true,
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
} as const;

const INITIAL_COLUMN_ORDER = [
  {
    key: 'type',
    visible: true,
  },
  {
    key: 'time',
    visible: true,
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
] as const;

const LOG_TYPES: {
  [level: string]: {
    label: string;
    color: string;
    icon?: React.ReactNode;
    style?: Object;
  };
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
    enum: Object.keys(LOG_TYPES).map((value) => ({
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
  lineHeight: '130%',
  marginTop: 5,
  paddingBottom: 3,
  '&::-webkit-scrollbar': {
    display: 'none',
  },
});

const LogCount = styled.div<{backgroundColor: string}>(({backgroundColor}) => ({
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

function pad(chunk: any, len: number): string {
  let str = String(chunk);
  while (str.length < len) {
    str = `0${str}`;
  }
  return str;
}

export function addEntriesToState(
  items: Entries,
  state: BaseState = {
    rows: [],
    entries: [],
  } as const,
  addDirection: 'up' | 'down' = 'up',
): BaseState {
  const rows = [...state.rows];
  const entries = [...state.entries];

  for (let i = 0; i < items.length; i++) {
    const {entry, row} = items[i];
    entries.push({row, entry});

    let previousEntry: DeviceLogEntry | null = null;

    if (i > 0) {
      previousEntry = items[i - 1].entry;
    } else if (state.rows.length > 0 && state.entries.length > 0) {
      previousEntry = state.entries[state.entries.length - 1].entry;
    }

    addRowIfNeeded(rows, row, entry, previousEntry, addDirection);
  }

  return {
    entries,
    rows,
  };
}

export function addRowIfNeeded(
  rows: Array<TableBodyRow>,
  row: TableBodyRow,
  entry: DeviceLogEntry,
  previousEntry: DeviceLogEntry | null,
  addDirection: 'up' | 'down' = 'up',
) {
  const previousRow =
    rows.length > 0
      ? addDirection === 'up'
        ? rows[rows.length - 1]
        : rows[0]
      : null;
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
    if (addDirection === 'up') {
      rows.push(row);
    } else {
      rows.unshift(row);
    }
  }
}

export function processEntry(
  entry: DeviceLogEntry,
  key: string,
): {
  row: TableBodyRow;
  entry: DeviceLogEntry;
} {
  const {icon, style} = LOG_TYPES[entry.type] || LOG_TYPES.debug;
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
  BaseAction,
  PersistedState
> {
  static keyboardActions: KeyboardActions = [
    'clear',
    'goToBottom',
    'createPaste',
  ];

  batchTimer: NodeJS.Timeout | undefined;

  static supportsDevice(device: Device) {
    return (
      device.os === 'Android' ||
      device.os === 'Metro' ||
      (device.os === 'iOS' && device.deviceType !== 'physical')
    );
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
    deepLinkPayload: unknown,
    rows: ReadonlyArray<TableBodyRow>,
  ): Set<string> => {
    const highlightedRows = new Set<string>();
    if (typeof deepLinkPayload !== 'string') {
      return highlightedRows;
    }

    // Run through array from last to first, because we want to show the last
    // time it the log we are looking for appeared.
    for (let i = rows.length - 1; i >= 0; i--) {
      const filterValue = rows[i].filterValue;
      if (filterValue != null && filterValue.includes(deepLinkPayload)) {
        highlightedRows.add(rows[i].key);
        break;
      }
    }
    if (highlightedRows.size <= 0) {
      // Check if the individual lines in the deeplinkPayload is matched or not.
      const arr = deepLinkPayload.split('\n');
      for (const msg of arr) {
        for (let i = rows.length - 1; i >= 0; i--) {
          const filterValue = rows[i].filterValue;
          if (filterValue != null && filterValue.includes(msg)) {
            highlightedRows.add(rows[i].key);
            break;
          }
        }
      }
    }
    return highlightedRows;
  };

  tableRef: ManagedTableClass | undefined;
  columns: TableColumns;
  columnSizes: TableColumnSizes;
  columnOrder: TableColumnOrder;
  logListener: Symbol | undefined;

  batch: Array<{
    readonly row: TableBodyRow;
    readonly entry: DeviceLogEntry;
  }> = [];
  queued: boolean = false;
  counter: number = 0;

  constructor(props: PluginProps<PersistedState>) {
    super(props);
    const supportedColumns = this.device.supportedColumns();
    this.columns = keepKeys(COLUMNS, supportedColumns);
    this.columnSizes = keepKeys(COLUMN_SIZE, supportedColumns);
    this.columnOrder = INITIAL_COLUMN_ORDER.filter((obj) =>
      supportedColumns.includes(obj.key),
    );

    const initialState = addEntriesToState(
      this.device
        .getLogs()
        .map((log) => processEntry(log, String(this.counter++))),
      this.state,
    );
    this.state = {
      ...initialState,
      highlightedRows: this.calculateHighlightedRows(
        props.deepLinkPayload,
        initialState.rows,
      ),
      counters: this.restoreSavedCounters(),
      timeDirection: 'up',
    };

    this.logListener = this.device.addLogListener((entry: DeviceLogEntry) => {
      const processedEntry = processEntry(entry, String(this.counter++));
      this.incrementCounterIfNeeded(processedEntry.entry);
      this.scheduleEntryForBatch(processedEntry);
    });
  }

  incrementCounterIfNeeded = (entry: DeviceLogEntry) => {
    let counterUpdated = false;
    const counters = this.state.counters.map((counter) => {
      if (entry.message.match(counter.expression)) {
        counterUpdated = true;
        if (counter.notify) {
          new Notification(`${counter.label}`, {
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

  scheduleEntryForBatch = (item: {
    row: TableBodyRow;
    entry: DeviceLogEntry;
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
        this.setState((state) =>
          addEntriesToState(thisBatch, state, state.timeDirection),
        );
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
    this.device.clearLogs().catch((e) => {
      console.error('Failed to clear logs: ', e);
    });
    this.setState({
      entries: [],
      rows: [],
      highlightedRows: new Set(),
      counters: this.state.counters.map((counter) => ({
        ...counter,
        count: 0,
      })),
    });
  };

  createPaste = () => {
    let paste = '';
    const mapFn = (row: TableBodyRow) =>
      Object.keys(COLUMNS)
        .map((key) => textContent(row.columns[key].value))
        .join('\t');

    if (this.state.highlightedRows.size > 0) {
      // create paste from selection
      paste = this.state.rows
        .filter((row) => this.state.highlightedRows.has(row.key))
        .map(mapFn)
        .join('\n');
    } else {
      // create paste with all rows
      paste = this.state.rows.map(mapFn).join('\n');
    }
    createPaste(paste);
  };

  setTableRef = (ref: ManagedTableClass) => {
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
        onChange={(counters) =>
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

  buildContextMenuItems: () => MenuTemplate = () => [
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
          allowRegexSearch={true}
          // If the logs is opened through deeplink, then don't scroll as the row is highlighted
          stickyBottom={
            !(this.props.deepLinkPayload && this.state.highlightedRows.size > 0)
          }
          initialSortOrder={{key: 'time', direction: 'up'}}
          onSort={(order: TableRowSortOrder) =>
            this.setState(
              produce((prevState) => {
                prevState.rows.reverse();
                prevState.timeDirection = order.direction;
              }),
            )
          }
        />
        <DetailSidebar>{this.renderSidebar()}</DetailSidebar>
      </LogTable.ContextMenu>
    );
  }
}

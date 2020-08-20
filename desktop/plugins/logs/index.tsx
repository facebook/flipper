/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {TableBodyRow, TableRowSortOrder} from 'flipper';
import {
  Device,
  DevicePluginClient,
  DeviceLogEntry,
  createState,
  usePlugin,
  useValue,
} from 'flipper-plugin';
import {Counter} from './LogWatcher';

import {
  ManagedTableClass,
  Button,
  colors,
  ContextMenu,
  FlexColumn,
  DetailSidebar,
  SearchableTable,
  styled,
  textContent,
  MenuTemplate,
} from 'flipper';
import LogWatcher from './LogWatcher';
import React, {useCallback, createRef, MutableRefObject} from 'react';
import {Icon, LogCount, HiddenScrollText} from './logComponents';
import {pad, getLineCount} from './logUtils';

const LOG_WATCHER_LOCAL_STORAGE_KEY = 'LOG_WATCHER_LOCAL_STORAGE_KEY';

type Entries = ReadonlyArray<{
  readonly row: TableBodyRow;
  readonly entry: DeviceLogEntry;
}>;

type BaseState = {
  readonly rows: ReadonlyArray<TableBodyRow>;
  readonly entries: Entries;
};

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

const COLUMN_ORDER = [
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

export function supportsDevice(device: Device) {
  return (
    device.os === 'Android' ||
    device.os === 'Metro' ||
    (device.os === 'iOS' && device.deviceType !== 'physical')
  );
}

export function devicePlugin(client: DevicePluginClient) {
  let counter = 0;
  let batch: Array<{
    readonly row: TableBodyRow;
    readonly entry: DeviceLogEntry;
  }> = [];
  let queued: boolean = false;
  let batchTimer: NodeJS.Timeout | undefined;
  const tableRef: MutableRefObject<ManagedTableClass | null> = createRef();

  // TODO T70688226: this can be removed once plugin stores logs,
  // rather than the device.

  const initialState = addEntriesToState(
    client.device.realDevice
      .getLogs()
      .map((log: DeviceLogEntry) => processEntry(log, '' + counter++)),
  );

  const rows = createState<ReadonlyArray<TableBodyRow>>(initialState.rows);
  const entries = createState<Entries>([]);
  const highlightedRows = createState<ReadonlySet<string>>(new Set());
  const counters = createState<ReadonlyArray<Counter>>(restoreSavedCounters());
  const timeDirection = createState<'up' | 'down'>('up');
  const isDeeplinked = createState(false);

  client.onDeepLink((payload: unknown) => {
    if (typeof payload === 'string') {
      highlightedRows.set(calculateHighlightedRows(payload, rows.get()));
      isDeeplinked.set(true);
    }
  });

  client.onDeactivate(() => {
    isDeeplinked.set(false);
    tableRef.current = null;
  });

  client.onDestroy(() => {
    if (batchTimer) {
      clearTimeout(batchTimer);
    }
  });

  client.addMenuEntry(
    {
      action: 'clear',
      handler: clearLogs,
    },
    {
      action: 'createPaste',
      handler: createPaste,
    },
    {
      action: 'goToBottom',
      handler: goToBottom,
    },
  );

  client.device.onLogEntry((entry: DeviceLogEntry) => {
    const processedEntry = processEntry(entry, '' + counter++);
    incrementCounterIfNeeded(processedEntry.entry);
    scheduleEntryForBatch(processedEntry);
  });

  // TODO: make local storage abstraction T69990351
  function restoreSavedCounters(): Counter[] {
    const savedCounters =
      window.localStorage.getItem(LOG_WATCHER_LOCAL_STORAGE_KEY) || '[]';
    return JSON.parse(savedCounters).map((counter: Counter) => ({
      ...counter,
      expression: new RegExp(counter.label, 'gi'),
      count: 0,
    }));
  }

  function calculateHighlightedRows(
    deepLinkPayload: unknown,
    rows: ReadonlyArray<TableBodyRow>,
  ): Set<string> {
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
  }

  function incrementCounterIfNeeded(entry: DeviceLogEntry) {
    let counterUpdated = false;
    const newCounters = counters.get().map((counter) => {
      if (entry.message.match(counter.expression)) {
        counterUpdated = true;
        if (counter.notify) {
          // TODO: use new notifications system T69990351
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
      counters.set(newCounters);
    }
  }

  function scheduleEntryForBatch(item: {
    row: TableBodyRow;
    entry: DeviceLogEntry;
  }) {
    // batch up logs to be processed every 250ms, if we have lots of log
    // messages coming in, then calling an setState 200+ times is actually
    // pretty expensive
    batch.push(item);

    if (!queued) {
      queued = true;

      batchTimer = setTimeout(() => {
        const thisBatch = batch;
        batch = [];
        queued = false;
        const newState = addEntriesToState(
          thisBatch,
          {
            rows: rows.get(),
            entries: entries.get(),
          },
          timeDirection.get(),
        );
        rows.set(newState.rows);
        entries.set(newState.entries);
      }, 100);
    }
  }

  function clearLogs() {
    // TODO T70688226: implement this when the store is local
    client.device.realDevice.clearLogs().catch((e: any) => {
      console.error('Failed to clear logs: ', e);
    });
    entries.set([]);
    rows.set([]);
    highlightedRows.set(new Set());
    counters.update((counters) => {
      for (const counter of counters) {
        counter.count = 0;
      }
    });
  }

  function createPaste() {
    let paste = '';
    const mapFn = (row: TableBodyRow) =>
      Object.keys(COLUMNS)
        .map((key) => textContent(row.columns[key].value))
        .join('\t');

    if (highlightedRows.get().size > 0) {
      // create paste from selection
      paste = rows
        .get()
        .filter((row) => highlightedRows.get().has(row.key))
        .map(mapFn)
        .join('\n');
    } else {
      // create paste with all rows
      paste = rows.get().map(mapFn).join('\n');
    }
    client.createPaste(paste);
  }

  function goToBottom() {
    tableRef.current?.scrollToBottom();
  }

  return {
    rows,
    highlightedRows,
    counters,
    isDeeplinked,
    tableRef,
    onRowHighlighted(selectedRows: Array<string>) {
      highlightedRows.set(new Set(selectedRows));
    },
    clearLogs,
    onSort(order: TableRowSortOrder) {
      rows.set(rows.get().slice().reverse());
      timeDirection.set(order.direction);
    },
    updateCounters(newCounters: readonly Counter[]) {
      counters.set(newCounters);
      // TODO: make local storage abstraction T69989583
      window.localStorage.setItem(
        LOG_WATCHER_LOCAL_STORAGE_KEY,
        JSON.stringify(newCounters),
      );
    },
  };
}

const DeviceLogsContextMenu = styled(ContextMenu)({
  flex: 1,
});

export function Component() {
  const plugin = usePlugin(devicePlugin);
  const rows = useValue(plugin.rows);
  const highlightedRows = useValue(plugin.highlightedRows);
  const isDeeplinked = useValue(plugin.isDeeplinked);

  const buildContextMenuItems = useCallback(
    (): MenuTemplate => [
      {
        type: 'separator',
      },
      {
        label: 'Clear all',
        click: plugin.clearLogs,
      },
    ],
    [plugin.clearLogs],
  );

  return (
    <DeviceLogsContextMenu
      buildItems={buildContextMenuItems}
      component={FlexColumn}>
      <SearchableTable
        innerRef={plugin.tableRef}
        floating={false}
        multiline={true}
        columnSizes={COLUMN_SIZE}
        columnOrder={COLUMN_ORDER}
        columns={COLUMNS}
        rows={rows}
        highlightedRows={highlightedRows}
        onRowHighlighted={plugin.onRowHighlighted}
        multiHighlight={true}
        defaultFilters={DEFAULT_FILTERS}
        zebra={false}
        actions={<Button onClick={plugin.clearLogs}>Clear Logs</Button>}
        allowRegexSearch={true}
        // If the logs is opened through deeplink, then don't scroll as the row is highlighted
        stickyBottom={!(isDeeplinked && highlightedRows.size > 0)}
        initialSortOrder={{key: 'time', direction: 'up'}}
        onSort={plugin.onSort}
      />
      <DetailSidebar>
        <Sidebar />
      </DetailSidebar>
    </DeviceLogsContextMenu>
  );
}

function Sidebar() {
  const plugin = usePlugin(devicePlugin);
  const counters = useValue(plugin.counters);
  return (
    <LogWatcher
      counters={counters}
      onChange={(counters) => {
        plugin.updateCounters(counters);
      }}
    />
  );
}

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  DevicePluginClient,
  DeviceLogEntry,
  usePlugin,
  createDataSource,
  DataTable,
  DataTableColumn,
  theme,
  DataTableManager,
  createState,
  useValue,
  DataFormatter,
} from 'flipper-plugin';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import React, {createRef, CSSProperties} from 'react';
import {Badge, Button} from 'antd';

import {baseRowStyle, logTypes} from './logTypes';

export type ExtendedLogEntry = DeviceLogEntry & {
  count: number;
};

function createColumnConfig(
  _os: 'iOS' | 'Android' | 'Metro',
): DataTableColumn<ExtendedLogEntry>[] {
  return [
    {
      key: 'type',
      title: '',
      width: 30,
      filters: Object.entries(logTypes).map(([value, config]) => ({
        label: config.label,
        value,
        enabled: config.enabled,
      })),
      onRender(entry) {
        return entry.count > 1 ? (
          <Badge
            count={entry.count}
            size="small"
            style={{
              marginTop: 4,
              color: theme.white,
              background:
                (logTypes[entry.type]?.style as any)?.color ??
                theme.textColorSecondary,
            }}
          />
        ) : (
          logTypes[entry.type]?.icon
        );
      },
    },
    {
      key: 'date',
      title: 'Time',
      width: 120,
    },
    {
      key: 'pid',
      title: 'PID',
      width: 60,
      visible: true,
    },
    {
      key: 'tid',
      title: 'TID',
      width: 60,
      visible: false,
    },
    {
      key: 'tag',
      title: 'Tag',
      width: 160,
    },
    {
      key: 'app',
      title: 'App',
      width: 160,
      visible: false,
    },
    {
      key: 'message',
      title: 'Message',
      wrap: true,
      formatters: [DataFormatter.prettyPrintJson, DataFormatter.linkify],
    },
  ];
}

function getRowStyle(entry: DeviceLogEntry): CSSProperties | undefined {
  return (logTypes[entry.type]?.style as any) ?? baseRowStyle;
}

export function devicePlugin(client: DevicePluginClient) {
  const rows = createDataSource<ExtendedLogEntry>([], {
    limit: 200000,
    persist: 'logs',
  });
  const isPaused = createState(true);
  const tableManagerRef = createRef<
    undefined | DataTableManager<ExtendedLogEntry>
  >();

  client.onDeepLink((payload: unknown) => {
    if (typeof payload === 'string') {
      // timeout as we want to await restoring any previous scroll positin first, then scroll to the
      setTimeout(() => {
        let hasMatch = false;
        rows.view.output(0, rows.view.size).forEach((row, index) => {
          if (row.message.includes(payload)) {
            tableManagerRef.current?.selectItem(index, hasMatch);
            hasMatch = true;
          }
        });
      }, 500);
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

  let logDisposer: (() => void) | undefined;

  function resumePause() {
    if (isPaused.get() && client.device.isConnected) {
      // start listening to the logs
      isPaused.set(false);
      logDisposer = client.device.onLogEntry((entry: DeviceLogEntry) => {
        const lastIndex = rows.size - 1;
        const previousRow = rows.get(lastIndex);
        if (
          previousRow &&
          previousRow.message === entry.message &&
          previousRow.tag === entry.tag &&
          previousRow.type === entry.type
        ) {
          rows.update(lastIndex, {
            ...previousRow,
            count: previousRow.count + 1,
          });
        } else {
          rows.append({
            ...entry,
            count: 1,
          });
        }
      });
    } else {
      logDisposer?.();
      isPaused.set(true);
    }
  }

  function clearLogs() {
    // Non public Android specific api
    (client.device.realDevice as any)?.clearLogs?.();
    rows.clear();
    tableManagerRef.current?.clearSelection();
  }

  function createPaste() {
    let selection = tableManagerRef.current?.getSelectedItems();
    if (!selection?.length) {
      selection = rows.view.output(0, rows.view.size);
    }
    if (selection?.length) {
      client.createPaste(JSON.stringify(selection, null, 2));
    }
  }

  function goToBottom() {
    tableManagerRef?.current?.selectItem(rows.view.size - 1);
  }

  // start listening to the logs
  resumePause();

  const columns = createColumnConfig(client.device.os as any);

  return {
    columns,
    isConnected: client.device.isConnected,
    isPaused,
    tableManagerRef,
    rows,
    clearLogs,
    resumePause,
  };
}

export function Component() {
  const plugin = usePlugin(devicePlugin);
  const paused = useValue(plugin.isPaused);
  return (
    <DataTable<ExtendedLogEntry>
      dataSource={plugin.rows}
      columns={plugin.columns}
      autoScroll
      onRowStyle={getRowStyle}
      extraActions={
        plugin.isConnected ? (
          <>
            <Button
              title={`Click to ${paused ? 'resume' : 'pause'} the log stream`}
              danger={paused}
              onClick={plugin.resumePause}>
              {paused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
            </Button>
            <Button title="Clear logs" onClick={plugin.clearLogs}>
              <DeleteOutlined />
            </Button>
          </>
        ) : undefined
      }
      tableManagerRef={plugin.tableManagerRef}
    />
  );
}

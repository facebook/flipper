/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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
  dataTablePowerSearchOperators,
  DataTableColumn,
  DataTable,
  theme,
  DataTableManager,
  createState,
  useValue,
  DataFormatter,
  EnumLabels,
  SearchExpressionTerm,
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
  pidStr: string; //for the purposes of inferring (only supports string type)
};

const logLevelEnumLabels = Object.entries(logTypes).reduce(
  (res, [key, {label}]) => {
    res[key] = label;
    return res;
  },
  {} as EnumLabels,
);

function createColumnConfig(
  _os: 'iOS' | 'Android' | 'Metro',
): DataTableColumn<ExtendedLogEntry>[] {
  return [
    {
      key: 'type',
      title: 'Level',
      width: 30,
      onRender(entry) {
        return entry.count > 1 ? (
          <Badge
            count={entry.count}
            size="small"
            style={{
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
      powerSearchConfig: {
        type: 'enum',
        enumLabels: logLevelEnumLabels,
      },
    },
    {
      key: 'date',
      title: 'Time',
      width: 120,
      powerSearchConfig: {
        type: 'dateTime',
      },
    },
    {
      key: 'pidStr',
      title: 'PID',
      width: 60,
      visible: true,
      powerSearchConfig: {
        type: 'enum',
        inferEnumOptionsFromData: true,
      },
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
      powerSearchConfig: {
        type: 'enum',
        inferEnumOptionsFromData: true,
      },
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
      formatters: [
        DataFormatter.truncate(400),
        DataFormatter.prettyPrintJson,
        DataFormatter.linkify,
      ],
    },
  ];
}

function getRowStyle(entry: DeviceLogEntry): CSSProperties | undefined {
  return (logTypes[entry.type]?.style as any) ?? baseRowStyle;
}

const powerSearchInitialState: SearchExpressionTerm[] = [
  {
    field: {
      key: 'type',
      label: 'Level',
    },
    operator:
      dataTablePowerSearchOperators.enum_set_is_any_of(logLevelEnumLabels),
    searchValue: Object.entries(logTypes)
      .filter(([_, item]) => item.enabled)
      .map(([key]) => key),
  },
];

export function devicePlugin(client: DevicePluginClient) {
  const rows = createDataSource<ExtendedLogEntry>([], {
    limit: 200000,
    persist: 'logs',
    indices: [['pidStr'], ['tag']], //there are for inferring enum types
  });
  const isPaused = createState(true);
  const tableManagerRef = createRef<
    undefined | DataTableManager<ExtendedLogEntry>
  >();

  client.onDeepLink((payload: unknown) => {
    if (typeof payload === 'string') {
      tableManagerRef.current?.setSearchExpression(powerSearchInitialState);
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
      accelerator: 'ctrl+l',
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
      logDisposer = client.onDeviceLogEntry((entry: DeviceLogEntry) => {
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
            pidStr: previousRow.pid.toString(),
            count: previousRow.count + 1,
          });
        } else {
          rows.append({
            ...entry,
            pidStr: entry.pid.toString(),
            count: 1,
          });
        }
      });
    } else {
      logDisposer?.();
      isPaused.set(true);
    }
  }

  async function clearLogs() {
    if (client.device.connected.get()) {
      await client.device.clearLogs();
    }
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
      enableAutoScroll
      enableMultiPanels
      onRowStyle={getRowStyle}
      enableHorizontalScroll={false}
      extraActions={
        plugin.isConnected ? (
          <>
            <Button
              type="ghost"
              title={`Click to ${paused ? 'resume' : 'pause'} the log stream`}
              danger={paused}
              onClick={plugin.resumePause}>
              {paused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
            </Button>
            <Button type="ghost" title="Clear logs" onClick={plugin.clearLogs}>
              <DeleteOutlined />
            </Button>
          </>
        ) : undefined
      }
      tableManagerRef={plugin.tableManagerRef}
      powerSearchInitialState={powerSearchInitialState}
    />
  );
}

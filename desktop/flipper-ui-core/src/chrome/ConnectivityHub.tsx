/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Layout} from '../ui';
import React, {createRef, CSSProperties} from 'react';
import {
  createDataSource,
  DataFormatter,
  DataTable,
  DataTableColumn,
  DataTableManager,
  Tab,
  Tabs,
  theme,
} from 'flipper-plugin';
import {CloseCircleFilled, DeleteOutlined} from '@ant-design/icons';
import {
  CommandRecordEntry,
  ConnectionRecordEntry,
  FlipperServer,
} from 'flipper-common';
import SetupDoctorScreen from '../sandy-chrome/SetupDoctorScreen';
import {ConsoleLogs} from './ConsoleLogs';
import {FlipperMessages} from './FlipperMessages';
import {Button} from 'antd';

const rows = createDataSource<ConnectionRecordEntry>([], {
  limit: 200000,
  persist: 'connectivity-logs',
});

export function enableConnectivityHub(flipperServer: FlipperServer) {
  flipperServer.on(
    'connectivity-troubleshoot-log',
    (entry: ConnectionRecordEntry) => {
      rows.append(entry);
    },
  );
  flipperServer.on(
    'connectivity-troubleshoot-cmd',
    (entry: CommandRecordEntry) => {
      rows.append(entry);
    },
  );
}

const iconStyle = {
  fontSize: '16px',
};

const baseRowStyle = {
  ...theme.monospace,
};

const logTypes: {
  [level: string]: {
    label: string;
    icon?: React.ReactNode;
    style?: CSSProperties;
    enabled: boolean;
  };
} = {
  log: {
    label: 'Log',
    enabled: true,
  },
  cmd: {
    label: 'Shell',
    enabled: true,
    style: {
      ...baseRowStyle,
      color: theme.primaryColor,
    },
    icon: <CloseCircleFilled style={iconStyle} />,
  },
  error: {
    label: 'Error',
    style: {
      ...baseRowStyle,
      color: theme.errorColor,
    },
    icon: <CloseCircleFilled style={iconStyle} />,
    enabled: true,
  },
};

function createColumnConfig(): DataTableColumn<ConnectionRecordEntry>[] {
  return [
    {
      key: 'time',
      title: 'Time',
      width: 160,
    },
    {
      key: 'device',
      title: 'Device',
      width: 160,
    },
    {
      key: 'app',
      title: 'App',
      width: 160,
      visible: true,
    },
    {
      key: 'medium',
      title: 'Medium',
      width: 80,
      visible: true,
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

function getRowStyle(entry: ConnectionRecordEntry): CSSProperties | undefined {
  return (logTypes[entry.type]?.style as any) ?? baseRowStyle;
}

function clearMessages() {
  rows.clear();
}

export function ConnectivityHub() {
  const columns = createColumnConfig();

  const tableManagerRef = createRef<
    undefined | DataTableManager<ConnectionRecordEntry>
  >();

  const clearButton = (
    <Button
      title="Clear logs"
      onClick={() => {
        clearMessages();
      }}>
      <DeleteOutlined />
    </Button>
  );

  const LogView = () => (
    <DataTable<ConnectionRecordEntry>
      dataSource={rows}
      columns={columns}
      enableAutoScroll
      enableMultiPanels
      onRowStyle={getRowStyle}
      enableHorizontalScroll={false}
      tableManagerRef={tableManagerRef}
      extraActions={clearButton}
    />
  );

  return (
    <Layout.Container grow>
      <Tabs grow>
        <Tab tab="Environment Check">
          <SetupDoctorScreen visible modal={false} onClose={() => {}} />
        </Tab>
        <Tab tab="Connectivity Logs">
          <LogView />
        </Tab>
        <Tab tab="Console Logs">
          <ConsoleLogs />
        </Tab>
        <Tab tab="Messages">
          <FlipperMessages />
        </Tab>
      </Tabs>
    </Layout.Container>
  );
}

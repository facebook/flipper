/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Layout, Panel} from '../ui';
import React, {CSSProperties, useCallback, useState} from 'react';
import {
  createDataSource,
  DataFormatter,
  DataInspector,
  DataTable,
  DataTableColumn,
  theme,
  styled,
} from 'flipper-plugin';
import {CloseCircleFilled, DeleteOutlined} from '@ant-design/icons';
import {
  CommandRecordEntry,
  ConnectionRecordEntry,
  DeviceOS,
  FlipperServer,
  FlipperServerCommands,
} from 'flipper-common';
import {Button} from 'antd';
import {getFlipperServer} from '../flipperServer';

const SIDEBAR_WIDTH = 400;

const rows = createDataSource<ConnectionRecordEntry>([], {
  limit: 200000,
  persist: 'connectivity-logs',
});

export function enableConnectivityHook(flipperServer: FlipperServer) {
  flipperServer.on(
    'connectivity-troubleshoot-log',
    (entries: ConnectionRecordEntry[]) => {
      entries.forEach((entry) => rows.append(entry));
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

const columns = createColumnConfig();

function getRowStyle(entry: ConnectionRecordEntry): CSSProperties | undefined {
  return (logTypes[entry.type]?.style as any) ?? baseRowStyle;
}

const Placeholder = styled(Layout.Container)({
  center: true,
  color: theme.textColorPlaceholder,
  fontSize: 18,
});

const PanelContainer = styled.div({
  width: SIDEBAR_WIDTH - 2 * 32,
  whiteSpace: 'pre-wrap',
  overflow: 'scroll',
});

function isShellCommand(
  entry: ConnectionRecordEntry,
): entry is CommandRecordEntry {
  return 'cmd' in entry;
}

function KillDebuggingBridge({os}: {os: DeviceOS}) {
  const {
    title,
    cmd,
  }: {
    title: string;
    cmd: keyof FlipperServerCommands;
  } =
    os === 'iOS'
      ? {title: 'Kill idb', cmd: 'ios-idb-kill'}
      : {title: 'Kill adb server', cmd: 'android-adb-kill'};

  return (
    <>
      <p>
        Sometimes the error can be resolved by killing the {os} debugging
        bridge.
      </p>
      <Button
        type="default"
        onClick={() => {
          getFlipperServer().exec(cmd);
        }}>
        {title}
      </Button>
    </>
  );
}

function Sidebar({selection}: {selection: undefined | ConnectionRecordEntry}) {
  const content: JSX.Element[] = [];

  if (selection) {
    if (isShellCommand(selection)) {
      content.push(
        <Panel key="cmd" heading="CMD">
          {selection.cmd}
        </Panel>,
        <Panel key="description" heading="Description">
          {selection.description}
        </Panel>,
        <Panel key="stdout" heading="STDOUT">
          <PanelContainer>{selection.stdout}</PanelContainer>
        </Panel>,
        <Panel key="stderr" heading="STDERR">
          <PanelContainer>{selection.stderr}</PanelContainer>
        </Panel>,
        <Panel key="troubleshoot" heading="Troubleshooting Tips">
          <p>{selection.troubleshoot}</p>
          {!selection.success && <KillDebuggingBridge os={selection.os} />}
        </Panel>,
      );
    }
    content.push(
      <Panel key="Raw" heading="Raw Details" collapsed>
        <DataInspector data={selection} />
      </Panel>,
    );
  } else {
    content.push(
      <Placeholder grow pad="large" center>
        Select an entry to visualize details
      </Placeholder>,
    );
  }

  return <Layout.ScrollContainer pad>{content}</Layout.ScrollContainer>;
}

function clearMessages() {
  rows.clear();
}

export const ConnectivityLogs = () => {
  const [selection, setSelection] = useState<
    ConnectionRecordEntry | undefined
  >();

  const clearButton = (
    <Button
      title="Clear logs"
      onClick={() => {
        setSelection(undefined);
        clearMessages();
      }}>
      <DeleteOutlined />
    </Button>
  );

  const onSelection = useCallback(
    (entry: ConnectionRecordEntry | undefined) => {
      if (entry !== undefined && isShellCommand(entry)) {
        setSelection(entry);
      } else {
        setSelection(undefined);
      }
    },
    [setSelection],
  );

  return (
    <Layout.Right resizable width={selection ? SIDEBAR_WIDTH : 0}>
      <DataTable<ConnectionRecordEntry>
        dataSource={rows}
        columns={columns}
        enableAutoScroll
        onRowStyle={getRowStyle}
        onSelect={onSelection}
        extraActions={clearButton}
      />
      {selection && <Sidebar selection={selection} />}
    </Layout.Right>
  );
};

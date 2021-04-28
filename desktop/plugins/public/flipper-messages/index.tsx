/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  DataInspector,
  DataTable,
  DataTableColumn,
  Layout,
  createState,
  PluginClient,
  usePlugin,
  useValue,
  createDataSource,
  DetailSidebar,
  Panel,
  theme,
  styled,
} from 'flipper-plugin';
import {Button} from 'antd';
import {DeleteOutlined} from '@ant-design/icons';
import React from 'react';

export interface MessageInfo {
  time?: Date;
  device?: string;
  app: string;
  flipperInternalMethod?: string;
  plugin?: string;
  pluginMethod?: string;
  payload?: any;
  direction: 'toClient' | 'toFlipper';
}

export interface MessageRow extends MessageInfo {
  time: Date;
}

const Placeholder = styled(Layout.Container)({
  center: true,
  color: theme.textColorPlaceholder,
  fontSize: 18,
});

function createRow(message: MessageInfo): MessageRow {
  return {
    ...message,
    time: message.time == null ? new Date() : message.time,
  };
}

type Events = {
  newMessage: MessageInfo;
};

const COLUMN_CONFIG: DataTableColumn<MessageRow>[] = [
  {
    key: 'time',
    title: 'Time',
  },
  {
    key: 'device',
    title: 'Device',
  },
  {
    key: 'app',
    title: 'App',
  },
  {
    key: 'flipperInternalMethod',
    title: 'Flipper Internal Method',
  },
  {
    key: 'plugin',
    title: 'Plugin',
  },
  {
    key: 'pluginMethod',
    title: 'Method',
  },
  {
    key: 'direction',
    title: 'Direction',
  },
];

export function plugin(client: PluginClient<Events, {}>) {
  const highlightedRow = createState<MessageRow>();
  const rows = createDataSource<MessageRow>([], {
    limit: 1024 * 10,
    persist: 'messages',
  });

  const setHighlightedRow = (record: MessageRow) => {
    highlightedRow.set(record);
  };

  const clear = () => {
    highlightedRow.set(undefined);
    rows.clear();
  };

  client.onMessage('newMessage', (payload) => {
    rows.append(createRow(payload));
  });

  return {
    rows,
    highlightedRow,
    setHighlightedRow,
    clear,
  };
}

function Sidebar() {
  const instance = usePlugin(plugin);
  const message = useValue(instance.highlightedRow);

  const renderExtra = (extra: any) => (
    <Panel title={'Payload'} collapsible={false}>
      <DataInspector data={extra} expandRoot={false} />
    </Panel>
  );

  return (
    <DetailSidebar>
      {message != null ? (
        renderExtra(message.payload)
      ) : (
        <Placeholder grow pad="large">
          Select a message to view details
        </Placeholder>
      )}
    </DetailSidebar>
  );
}

export function Component() {
  const instance = usePlugin(plugin);

  const clearTableButton = (
    <Button title="Clear logs" onClick={instance.clear}>
      <DeleteOutlined />
    </Button>
  );

  return (
    <Layout.Container grow>
      <DataTable<MessageRow>
        dataSource={instance.rows}
        columns={COLUMN_CONFIG}
        onSelect={instance.setHighlightedRow}
        extraActions={clearTableButton}
      />
      <Sidebar />
    </Layout.Container>
  );
}

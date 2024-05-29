/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {WarningOutlined} from '@ant-design/icons';
import {Button, Modal, Table, Typography, TableColumnType} from 'antd';
import {Layout, theme} from 'flipper-plugin';
import Client from 'flipper-ui/src/Client';
import {getPluginKey} from 'flipper-ui/src/deprecated-exports';
import {PluginDefinition} from 'flipper-ui/src/plugin';
import {switchPlugin} from 'flipper-ui/src/reducers/pluginManager';
import {getStore} from 'flipper-ui/src/store';
import React, {useEffect, useState} from 'react';
import {useDispatch} from '../../utils/useStore';
import {Dispatch} from 'redux';

const PluginQueueMemoryUsageScanInterval = 2500;

export function PluginMemoryWarning() {
  const [_, rerender] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  useEffect(() => {
    const handle = setInterval(() => {
      rerender((x) => x + 1);
    }, PluginQueueMemoryUsageScanInterval);

    return () => {
      clearInterval(handle);
    };
  }, []);

  const totalSizeMb = getQueuedMessagedConsumption();

  if (totalSizeMb < 50) {
    return null;
  }

  const color = totalSizeMb < 150 ? theme.warningColor : theme.errorColor;

  return (
    <Layout.Container pad="small">
      <Button
        style={{padding: 4}}
        type="ghost"
        onClick={() => {
          setIsModalOpen(true);
        }}
        icon={
          <WarningOutlined style={{color, fontSize: theme.fontSize.large}} />
        }>
        {totalSizeMb.toFixed(0)}Mb queued messages
      </Button>

      {isModalOpen && (
        <Modal
          open={isModalOpen}
          destroyOnClose
          onCancel={() => setIsModalOpen(false)}
          width="100%"
          footer={null}
          style={{
            top: '5vh',
          }}>
          <PluginMemoryDetails rerender={() => rerender((x) => x + 1)} />
        </Modal>
      )}
    </Layout.Container>
  );
}

function columns(
  rerender: () => void,
  dispatch: Dispatch,
): TableColumnType<PluginMemoryStats>[] {
  return [
    {
      title: 'Plugin name',
      dataIndex: 'name',
      key: 'name',
      render: (value) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Application',
      dataIndex: 'app',
      key: 'app',
    },

    {
      title: 'Device',
      dataIndex: 'device',
      key: 'device',
    },

    {
      title: 'Queued messages count',
      dataIndex: 'count',
      key: 'count',
    },
    {
      title: 'Queued messages consumption (Mb)',
      dataIndex: 'messagesmb',
      key: 'messagesmb',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.messagesmb - b.messagesmb,
      render: (value) => value.toFixed(0),
    },
    {
      title: 'Actions',
      dataIndex: 'actions',
      key: 'actions',
      render: (_, record) => {
        return (
          <Button
            type="primary"
            onClick={() => {
              dispatch(
                switchPlugin({
                  plugin: record.pluginDef,
                  selectedApp: record.app,
                }),
              );
              rerender();
            }}>
            Deactivate
          </Button>
        );
      },
    },
  ];
}
type PluginMemoryStats = {
  name: string;
  app: string;
  count: number;
  device: string;
  messagesmb: number;
  pluginId: string;
  pluginDef: PluginDefinition;
};
function PluginMemoryDetails({rerender}: {rerender: () => void}) {
  const clients = getStore().getState().connections.clients;
  const pluginQueue = getStore().getState().pluginMessageQueue;
  const dispatch = useDispatch();

  const pluginStats = Object.keys(pluginQueue).map((pluginKey) => {
    const [pluginDef, client] = matchPluginKeyToClient(pluginKey, clients) ?? [
      null,
      null,
    ];

    return {
      pluginId: pluginDef?.id,
      name: pluginDef?.title ?? pluginDef?.id,
      app: client?.query.app ?? 'Unknown',
      count: pluginQueue[pluginKey].length,
      pluginDef,
      device: client?.query.device ?? 'Unknown',
      messagesmb:
        pluginQueue[pluginKey].reduce((acc, value) => value.rawSize + acc, 0) /
        1000000,
    } as PluginMemoryStats;
  });

  console.log('rendeing modal');

  return (
    <Layout.Container
      style={{minHeight: '80vh', width: '100%', display: 'flex'}}>
      <Typography.Title level={2}>
        Background plugin memory usage
      </Typography.Title>
      <br />
      <Typography.Text>
        Background plugins do not consume messages untill you select them in the
        UI, they are buffered in memory instead.
        <br /> To free up memory, you can deactivate plugins you do not need in
        this session.
        <br />
        <br />
      </Typography.Text>
      <Table
        columns={columns(rerender, dispatch)}
        dataSource={pluginStats}
        pagination={false}
      />
    </Layout.Container>
  );
}

function getQueuedMessagedConsumption() {
  const messageQueues = getStore().getState().pluginMessageQueue;
  let totalSize = 0;
  for (const queue of Object.values(messageQueues)) {
    for (const message of queue) {
      totalSize += message.rawSize;
    }
  }

  const totalSizeMb = totalSize / 1000000;
  return totalSizeMb;
}
function matchPluginKeyToClient(
  pluginKey: string,
  clients: Map<string, Client>,
): [PluginDefinition, Client] | null {
  for (const client of clients.values()) {
    for (const plugin of [
      ...client.plugins.values(),
      ...client.backgroundPlugins.values(),
    ]) {
      const candidateKey = getPluginKey(
        client.id,
        {serial: client.query.device_id},
        plugin,
      );
      if (candidateKey === pluginKey) {
        const pluginDef = [
          ...getStore().getState().plugins.clientPlugins.values(),
        ].find((pluginDef) => pluginDef.id === plugin);
        return ([pluginDef, client] as [PluginDefinition, Client]) ?? null;
      }
    }
  }
  return null;
}

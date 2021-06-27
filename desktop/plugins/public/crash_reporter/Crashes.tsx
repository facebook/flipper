/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Button, Typography} from 'antd';
import {CoffeeOutlined, CopyOutlined, DeleteOutlined} from '@ant-design/icons';
import {
  usePlugin,
  useValue,
  DataList,
  Layout,
  CodeBlock,
  Toolbar,
} from 'flipper-plugin';
import {Crash, devicePlugin} from './index';

const {Text} = Typography;
export function Crashes() {
  const plugin = usePlugin(devicePlugin);
  const crashes = useValue(plugin.crashes);
  const selectedCrashId = useValue(plugin.selectedCrash);
  const selectedCrash = crashes.find(
    (c) => c.notificationID === selectedCrashId,
  );

  return (
    <Layout.Left resizable width={400}>
      <DataList
        items={crashes.map((crash) => ({
          id: crash.notificationID,
          title: crash.reason ?? crash.name,
          description: `${crash.date.toLocaleString()} - ${crash.name}`,
        }))}
        selection={selectedCrashId}
        onSelect={(id) => {
          plugin.selectedCrash.set(id);
        }}
        onRenderEmpty={null}
      />
      {selectedCrash ? (
        <CrashDetails crash={selectedCrash} />
      ) : (
        <Layout.Horizontal center grow>
          <Layout.Container center grow gap>
            <CoffeeOutlined />
            <Text type="secondary">
              {crashes.length === 0
                ? 'No crashes detected so far!'
                : 'No crash selected'}
            </Text>
          </Layout.Container>
        </Layout.Horizontal>
      )}
    </Layout.Left>
  );
}

function CrashDetails({crash}: {crash: Crash}) {
  const plugin = usePlugin(devicePlugin);

  return (
    <Layout.Top>
      <Toolbar
        wash
        right={
          <Button
            onClick={() => {
              plugin.clearCrashes();
            }}
            title="Clear all crashes"
            danger>
            <DeleteOutlined />
          </Button>
        }>
        <Button
          onClick={() => {
            plugin.copyCrashToClipboard(crash.callstack!);
          }}>
          <CopyOutlined />
        </Button>
        {plugin.isFB ? (
          <Button
            onClick={() => {
              plugin.createPaste(crash.callstack!);
            }}>
            Create paste
          </Button>
        ) : null}
        <Button
          disabled={!crash.callstack}
          onClick={() => {
            plugin.openInLogs(crash.callstack!);
          }}>
          Open In Logs
        </Button>
      </Toolbar>
      <Layout.ScrollContainer pad vertical>
        <CodeBlock>
          <Text strong>{crash.name}</Text>
          <br />
          <br />
          <Text strong>{crash.reason}</Text>
          <br />
          <br />
          {crash.callstack}
        </CodeBlock>
      </Layout.ScrollContainer>
    </Layout.Top>
  );
}

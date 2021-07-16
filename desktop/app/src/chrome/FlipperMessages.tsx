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
  createDataSource,
  theme,
  styled,
  useValue,
} from 'flipper-plugin';
import {Button} from 'antd';
import {
  DeleteOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import React, {useCallback, useState} from 'react';

export type MessageInfo = {
  time?: Date;
  device?: string;
  app: string;
  flipperInternalMethod?: string;
  plugin?: string;
  pluginMethod?: string;
  payload?: any;
  direction:
    | 'toClient:call'
    | 'toClient:send'
    | 'toFlipper:message'
    | 'toFlipper:response';
};

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

const flipperDebugMessages = createDataSource<MessageRow>([], {
  limit: 1024 * 10,
  persist: 'messages',
});
const flipperDebugMessagesEnabled = createState(false);

export function registerFlipperDebugMessage(message: MessageInfo) {
  if (flipperDebugMessagesEnabled.get()) {
    flipperDebugMessages.append(createRow(message));
  }
}

export function isFlipperMessageDebuggingEnabled(): boolean {
  return flipperDebugMessagesEnabled.get();
}

// exposed for testing
export function setFlipperMessageDebuggingEnabled(value: boolean) {
  flipperDebugMessagesEnabled.set(value);
}

// exposed for testing
export function clearFlipperDebugMessages() {
  flipperDebugMessages.clear();
}

// exposed for testing ONLY!
export function getFlipperDebugMessages() {
  return flipperDebugMessages.records();
}

function Sidebar({selection}: {selection: undefined | MessageRow}) {
  const renderExtra = (extra: any) => (
    <DataInspector data={extra} expandRoot={false} />
  );

  return (
    <Layout.ScrollContainer pad>
      {selection != null ? (
        renderExtra(selection.payload)
      ) : (
        <Placeholder grow pad="large">
          Select a message to view details
        </Placeholder>
      )}
    </Layout.ScrollContainer>
  );
}

const PauseResumeButton = () => {
  const paused = !useValue(flipperDebugMessagesEnabled);

  return (
    <Button
      title={`Click to enable tracing flipper messages`}
      danger={!paused}
      onClick={() => {
        flipperDebugMessagesEnabled.update((v) => !v);
      }}>
      {paused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
    </Button>
  );
};

export function FlipperMessages() {
  const [selection, setSelection] = useState<MessageRow | undefined>();
  const paused = !useValue(flipperDebugMessagesEnabled);

  const clearTableButton = (
    <Button
      title="Clear logs"
      onClick={() => {
        clearFlipperDebugMessages();
        setSelection(undefined);
      }}>
      <DeleteOutlined />
    </Button>
  );

  const renderEmpty = useCallback(
    () => (
      <Layout.Container center pad gap style={{width: '100%', marginTop: 200}}>
        {paused ? (
          <>
            Click to enable debugging Flipper messages between the Flipper
            application and connected clients: <PauseResumeButton />
          </>
        ) : (
          'Waiting for data...'
        )}
      </Layout.Container>
    ),
    [paused],
  );

  return (
    <Layout.Right resizable width={400}>
      <DataTable<MessageRow>
        dataSource={flipperDebugMessages}
        columns={COLUMN_CONFIG}
        onSelect={setSelection}
        enableAutoScroll
        onRenderEmpty={renderEmpty}
        extraActions={
          <>
            <PauseResumeButton />
            {clearTableButton}
          </>
        }
      />
      <Sidebar selection={selection} />
    </Layout.Right>
  );
}

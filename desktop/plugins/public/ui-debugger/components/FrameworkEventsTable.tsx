/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PartitionOutlined} from '@ant-design/icons';
import {
  DataTable,
  DataTableColumn,
  DataTableManager,
  Layout,
  usePlugin,
} from 'flipper-plugin';
import React, {useEffect, useRef} from 'react';
import {FrameworkEvent, Id, NodeMap} from '../ClientTypes';
import {plugin} from '../index';
import {Button, Tooltip} from 'antd';
import {AugmentedFrameworkEvent} from '../DesktopTypes';
import {formatDuration, formatTimestampMillis} from '../utils/timeUtils';
import {eventTypeToName} from './sidebar/inspector/FrameworkEventsInspector';
import {startCase} from 'lodash';

export function FrameworkEventsTable({nodeId}: {nodeId: Id; nodes: NodeMap}) {
  const instance = usePlugin(plugin);

  const managerRef = useRef<DataTableManager<AugmentedFrameworkEvent> | null>(
    null,
  );

  useEffect(() => {
    if (nodeId != null) {
      managerRef.current?.resetFilters();
      managerRef.current?.addColumnFilter('nodeId', nodeId as string);
    }
  }, [nodeId]);

  return (
    <Layout.Container grow>
      <DataTable<FrameworkEvent>
        dataSource={instance.frameworkEvents}
        tableManagerRef={managerRef}
        columns={columns}
        extraActions={
          <Tooltip title="Back to tree">
            <Button
              onClick={() => {
                instance.uiActions.onSetViewMode({mode: 'default'});
              }}
              icon={<PartitionOutlined />}></Button>
          </Tooltip>
        }
      />
    </Layout.Container>
  );
}

const columns: DataTableColumn<AugmentedFrameworkEvent>[] = [
  {
    key: 'timestamp',
    onRender: (row: FrameworkEvent) => formatTimestampMillis(row.timestamp),
    title: 'Timestamp',
  },
  {
    key: 'type',
    title: 'Event type',
    onRender: (row: FrameworkEvent) => eventTypeToName(row.type),
  },
  {
    key: 'duration',
    title: 'Duration',
    onRender: (row: FrameworkEvent) =>
      row.duration != null ? formatDuration(row.duration) : null,
  },
  {
    key: 'treeId',
    title: 'TreeId',
  },
  {
    key: 'rootComponentName',
    title: 'Root component name',
  },
  {
    key: 'nodeId',
    title: 'Component ID',
  },
  {
    key: 'nodeName',
    title: 'Component name',
  },
  {
    key: 'thread',
    title: 'Thread',
    onRender: (row: FrameworkEvent) => startCase(row.thread),
  },
  {
    key: 'payload',
    title: 'Payload',
    onRender: (row: FrameworkEvent) =>
      Object.keys(row.payload ?? {}).length > 0
        ? JSON.stringify(row.payload)
        : null,
  },
];

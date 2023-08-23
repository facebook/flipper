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
  DetailSidebar,
  Layout,
  usePlugin,
  useValue,
} from 'flipper-plugin';
import React, {useCallback, useEffect, useRef} from 'react';
import {FrameworkEvent, Id, NodeMap} from '../ClientTypes';
import {plugin} from '../index';
import {Button, Result, Tooltip} from 'antd';
import {AugmentedFrameworkEvent} from '../DesktopTypes';
import {formatDuration, formatTimestampMillis} from '../utils/timeUtils';
import {eventTypeToName} from './sidebar/inspector/FrameworkEventsInspector';
import {startCase} from 'lodash';
import {Visualization2D} from './visualizer/Visualization2D';
import {getNode} from '../utils/map';

export function FrameworkEventsTable({
  nodeId,
  isTree,
  nodes,
}: {
  nodeId: Id;
  nodes: NodeMap;
  isTree: boolean;
}) {
  const instance = usePlugin(plugin);

  const focusedNode = useValue(instance.uiState.focusedNode);
  const managerRef = useRef<DataTableManager<AugmentedFrameworkEvent> | null>(
    null,
  );

  useEffect(() => {
    instance.uiActions.onSelectNode(undefined, 'tree');
    if (nodeId != null) {
      managerRef.current?.resetFilters();
      if (isTree) {
        managerRef.current?.addColumnFilter('treeId', nodeId as string, {
          exact: true,
        });
      } else {
        managerRef.current?.addColumnFilter('nodeId', nodeId as string, {
          exact: true,
        });
      }
    }
  }, [instance.uiActions, isTree, nodeId]);

  const onSelectRow = useCallback(
    (event: FrameworkEvent | undefined): void => {
      instance.uiActions.onFocusNode(event?.nodeId);
    },
    [instance.uiActions],
  );
  return (
    <Layout.Container grow>
      <DataTable<FrameworkEvent>
        dataSource={instance.frameworkEvents}
        tableManagerRef={managerRef}
        onSelect={onSelectRow}
        columns={columns}
        extraActions={
          <Tooltip title="Back to tree">
            <Button
              onClick={() => {
                instance.uiActions.onFocusNode(undefined);
                instance.uiActions.onSetViewMode({mode: 'default'});
              }}
              icon={<PartitionOutlined />}></Button>
          </Tooltip>
        }
      />
      <DetailSidebar width={450}>
        {getNode(focusedNode, nodes) != null ? (
          <Visualization2D
            disableInteractivity
            hideControls
            width={400}
            nodes={nodes}
            onSelectNode={instance.uiActions.onSelectNode}
          />
        ) : (
          <Result title="Node is no longer on screen" />
        )}
      </DetailSidebar>
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

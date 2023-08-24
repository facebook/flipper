/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DeleteOutlined, PartitionOutlined} from '@ant-design/icons';
import {
  DataTable,
  DataTableColumn,
  DataTableManager,
  DetailSidebar,
  Layout,
  usePlugin,
  useValue,
} from 'flipper-plugin';
import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {FrameworkEvent, Id, NodeMap} from '../ClientTypes';
import {plugin} from '../index';
import {Button, Result, Tooltip} from 'antd';
import {AugmentedFrameworkEvent} from '../DesktopTypes';
import {formatDuration, formatTimestampMillis} from '../utils/timeUtils';
import {eventTypeToName} from './sidebar/inspector/FrameworkEventsInspector';
import {startCase} from 'lodash';
import {Visualization2D} from './visualizer/Visualization2D';
import {getNode} from '../utils/map';
import {tracker} from '../utils/tracker';

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
    tracker.track('framework-event-table-opened', {});
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

  const allColumns = useMemo(() => {
    const customColumnKeys = instance.frameworkEventsCustomColumns.get();

    const customColumns = [...customColumnKeys].map(
      (customKey: string) =>
        ({
          key: customKey,
          title: startCase(customKey),
          onRender: (row: AugmentedFrameworkEvent) => row.payload?.[customKey],
        } as DataTableColumn<AugmentedFrameworkEvent>),
    );

    return staticColumns.concat(customColumns);
  }, [instance.frameworkEventsCustomColumns]);

  const onSelectRow = useCallback(
    (event: FrameworkEvent | undefined): void => {
      if (event != null) {
        tracker.track('framework-event-table-row-selected', {
          eventType: event.type,
        });
      }

      instance.uiActions.onFocusNode(event?.nodeId);
    },
    [instance.uiActions],
  );
  return (
    <Layout.Container grow>
      <DataTable<FrameworkEvent>
        enableAutoScroll
        dataSource={instance.frameworkEvents}
        tableManagerRef={managerRef}
        onSelect={onSelectRow}
        columns={allColumns}
        extraActions={
          <>
            <Tooltip title="Back to tree">
              <Button
                onClick={() => {
                  instance.uiActions.onFocusNode(undefined);
                  instance.uiActions.onSetViewMode({mode: 'default'});
                }}
                icon={<PartitionOutlined />}></Button>
            </Tooltip>
            <Tooltip title="Delete all events">
              <Button
                onClick={() => {
                  instance.frameworkEvents.clear();
                  managerRef.current?.clearSelection();
                }}
                icon={<DeleteOutlined />}></Button>
            </Tooltip>
          </>
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

const staticColumns: DataTableColumn<AugmentedFrameworkEvent>[] = [
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
];

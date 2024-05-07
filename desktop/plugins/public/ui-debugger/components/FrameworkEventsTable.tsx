/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CloseOutlined, DeleteOutlined} from '@ant-design/icons';
import {
  DataTable,
  DataTableColumn,
  DetailSidebar,
  Layout,
  DataTableManager,
  dataTablePowerSearchOperators,
  usePlugin,
  useValue,
} from 'flipper-plugin';
import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {FrameworkEvent, Id, NodeMap} from '../ClientTypes';
import {plugin} from '../index';
import {Button, Result, Tooltip} from 'antd';
import {AugmentedFrameworkEvent} from '../DesktopTypes';
import {formatDuration, formatTimestampMillis} from '../utils/timeUtils';
import {eventTypeToName} from './sidebarV2/frameworkevents/FrameworkEventsInspector';
import {startCase} from 'lodash';
import {Visualization2D} from './visualizer/Visualization2D';
import {getNode} from '../utils/map';
import {tracker} from '../utils/tracker';

export function FrameworkEventsTable({
  nodeId,
  isTree,
  nodes,
}: {
  nodeId: Id | null;
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
        managerRef.current?.setSearchExpression([
          {
            field: {
              key: 'treeId',
              label: 'TreeId',
            },
            operator: {
              ...dataTablePowerSearchOperators.int_equals(),
            },
            searchValue: nodeId,
          },
        ]);
      } else {
        managerRef.current?.setSearchExpression([
          {
            field: {
              key: 'nodeId',
              label: 'NodeId',
            },
            operator: {
              ...dataTablePowerSearchOperators.int_equals(),
            },
            searchValue: nodeId,
          },
        ]);
      }
    }
  }, [instance.uiActions, isTree, nodeId]);

  const allColumns = useMemo(() => {
    const customColumnKeys = instance.frameworkEventsCustomColumns.get();

    const customColumns = [...customColumnKeys].map(
      (customKey: string) =>
        ({
          key: `payload.${customKey}` as any,
          title: startCase(customKey),
          powerSearchConfig: {type: 'string'},
        }) as DataTableColumn<AugmentedFrameworkEvent>,
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
                type="ghost"
                onClick={() => {
                  instance.uiActions.onFocusNode(undefined);
                  instance.uiActions.onSetViewMode({mode: 'default'});
                }}
                icon={<CloseOutlined />}></Button>
            </Tooltip>
            <Tooltip title="Delete all events">
              <Button
                type="ghost"
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
          <Visualization2D disableInteractivity hideControls nodes={nodes} />
        ) : (
          <Result title="Node is no longer on screen" />
        )}
      </DetailSidebar>
    </Layout.Container>
  );
}

const MonoSpace = (t: any) => (
  <span style={{fontFamily: 'monospace'}}>{t}</span>
);

const idConfig = [dataTablePowerSearchOperators.int_equals()];

const staticColumns: DataTableColumn<AugmentedFrameworkEvent>[] = [
  {
    key: 'timestamp',
    sortable: true,
    onRender: (row: FrameworkEvent) => formatTimestampMillis(row.timestamp),
    title: 'Timestamp',
    formatters: MonoSpace,

    powerSearchConfig: [
      dataTablePowerSearchOperators.newer_than_absolute_date(),
      dataTablePowerSearchOperators.older_than_absolute_date(),
    ],
  },
  {
    key: 'type',
    title: 'Event type',
    onRender: (row: FrameworkEvent) => eventTypeToName(row.type),
    powerSearchConfig: {type: 'enum', inferEnumOptionsFromData: true},
  },
  {
    key: 'duration',
    title: 'Duration (Nanos)',
    onRender: (row: FrameworkEvent) =>
      row.duration != null ? formatDuration(row.duration) : null,
    formatters: MonoSpace,
    powerSearchConfig: {type: 'int'},
  },
  {
    key: 'treeId',
    title: 'TreeId',
    powerSearchConfig: idConfig,

    formatters: MonoSpace,
  },
  {
    key: 'rootComponentName',
    title: 'Root component name',
    powerSearchConfig: {type: 'string'},
    formatters: MonoSpace,
  },
  {
    key: 'nodeId',
    title: 'Component ID',
    powerSearchConfig: idConfig,
    formatters: MonoSpace,
  },
  {
    key: 'nodeName',
    title: 'Component name',
    powerSearchConfig: {type: 'string'},
    formatters: MonoSpace,
  },
  {
    key: 'thread',
    title: 'Thread',
    onRender: (row: FrameworkEvent) => startCase(row.thread),
    powerSearchConfig: {type: 'enum', inferEnumOptionsFromData: true},
    formatters: MonoSpace,
  },
];

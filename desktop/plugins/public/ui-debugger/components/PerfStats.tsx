/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  PerformanceStatsEvent,
  DynamicPerformanceStatsEvent,
  Id,
  ClientNode,
  FrameworkEvent,
} from '../ClientTypes';
import {ReadOnlyUIState} from '../DesktopTypes';
import React, {useMemo} from 'react';
import {
  DataInspector,
  DataSource,
  DataTable,
  DataTableColumn,
  DetailSidebar,
  Layout,
} from 'flipper-plugin';

export function PerfStats(props: {
  uiState: ReadOnlyUIState;
  nodes: Map<Id, ClientNode>;
  rootId?: Id;
  events: DataSource<DynamicPerformanceStatsEvent, number>;
  frameworkEvents: DataSource<FrameworkEvent>;
}) {
  const uiStateValues = Object.entries(props.uiState).map(([key, value]) => [
    key,
    value.get(),
  ]);

  const allColumns = useMemo(() => {
    if (props.events.size > 0) {
      const row = props.events.get(0);

      const unknownKeys = Object.keys(row).filter(
        (property) => !knownKeys.has(property),
      );

      const unknownColumns = unknownKeys.map((unknwonKey) => ({
        key: unknwonKey,
        title: formatKey(unknwonKey),
        onRender: (row: DynamicPerformanceStatsEvent) => {
          if (unknwonKey.endsWith('MS')) {
            return formatDiff(row[unknwonKey]);
          }
          return row[unknwonKey];
        },
      }));

      return columns.concat(...unknownColumns);
    }
    return columns;
  }, [props.events]);

  return (
    <Layout.Container grow>
      <DataTable<PerformanceStatsEvent>
        dataSource={props.events}
        columns={allColumns}
      />
      <DetailSidebar width={250}>
        <DataInspector
          data={{
            ...Object.fromEntries(uiStateValues),
            rootId: props.rootId,
            nodesCount: props.nodes.size,
            rootNode: props.nodes.get(props.rootId ?? 'noroot'),
            frameworkEventsSize: props.frameworkEvents.size,
          }}></DataInspector>
      </DetailSidebar>
    </Layout.Container>
  );
}

function formatDiff(ms: number): string {
  return `${ms.toFixed(0)}ms`;
}

function formatSize(bytes: number): string {
  return `${(bytes / 1000).toFixed()}`;
}

function formatKey(key: string): string {
  const pascalCase = key.replace(/([a-z])([A-Z])/g, '$1 $2');
  return pascalCase.charAt(0).toUpperCase() + pascalCase.slice(1);
}

const columns: DataTableColumn<DynamicPerformanceStatsEvent>[] = [
  {
    key: 'txId',
    title: 'TXID',
    onRender: (row: PerformanceStatsEvent) => {
      return row.txId.toFixed(0);
    },
  },
  {
    key: 'observerType',
    title: 'Type',
  },
  {
    key: 'nodesCount',
    title: 'Total nodes',
  },
  {
    key: 'start',
    title: 'Start',
    onRender: (row: PerformanceStatsEvent) => {
      return new Date(row.start).toISOString();
    },
  },
  {
    key: 'traversalMS',
    title: 'Traversal time (Main thread)',
    onRender: (row: PerformanceStatsEvent) => {
      return formatDiff(row.traversalMS);
    },
  },
  {
    key: 'snapshotMS',
    title: 'Snapshot time (Main thread)',
    onRender: (row: PerformanceStatsEvent) => {
      return formatDiff(row.snapshotMS);
    },
  },
  {
    key: 'queuingMS',
    title: 'Queuing time',
    onRender: (row: PerformanceStatsEvent) => {
      return formatDiff(row.queuingMS);
    },
  },
  {
    key: 'deferredComputationMS',
    title: 'Deferred processing time',
    onRender: (row: PerformanceStatsEvent) => {
      return formatDiff(row.deferredComputationMS);
    },
  },
  {
    key: 'serializationMS',
    title: 'Serialization time',
    onRender: (row: PerformanceStatsEvent) => {
      return formatDiff(row.serializationMS);
    },
  },
  {
    key: 'socketMS',
    title: 'Socket send time',
    onRender: (row: PerformanceStatsEvent) => {
      return formatDiff(row.socketMS);
    },
  },
  {
    key: 'payloadSize',
    title: 'Payload Size (KB)',
    onRender: (row: PerformanceStatsEvent) => {
      if (!row.payloadSize) {
        return 'NaN';
      }
      return formatSize(row.payloadSize);
    },
  },
];
const knownKeys = new Set(columns.map((column) => column.key));

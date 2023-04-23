/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PerformanceStatsEvent} from '../types';
import React from 'react';
import {DataSource, DataTable, DataTableColumn} from 'flipper-plugin';

export function PerfStats(props: {
  events: DataSource<PerformanceStatsEvent, number>;
}) {
  return (
    <DataTable<PerformanceStatsEvent>
      dataSource={props.events}
      columns={columns}
    />
  );
}

function formatDiff(ms: number): string {
  return `${ms.toFixed(0)}ms`;
}

function formatSize(bytes: number): string {
  return `${(bytes / 1000).toFixed()}`;
}

const columns: DataTableColumn<PerformanceStatsEvent>[] = [
  {
    key: 'txId',
    title: 'TXID',
    onRender: (row: PerformanceStatsEvent) => {
      return row.txId;
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

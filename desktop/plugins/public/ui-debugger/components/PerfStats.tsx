/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PerfStatsEvent} from '../types';
import React from 'react';
import {DataSource, DataTable, DataTableColumn} from 'flipper-plugin';

export function PerfStats(props: {events: DataSource<PerfStatsEvent, number>}) {
  return (
    <DataTable<PerfStatsEvent> dataSource={props.events} columns={columns} />
  );
}

function formatDiff(start: number, end: number): string {
  const ms = end - start;
  return `${ms.toFixed(0)}ms`;
}

const columns: DataTableColumn<PerfStatsEvent>[] = [
  {
    key: 'txId',
    title: 'TXID',
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
    onRender: (row: PerfStatsEvent) => {
      return new Date(row.start).toISOString();
    },
  },
  {
    key: 'traversalComplete',
    title: 'Traversal time (Main thread)',
    onRender: (row: PerfStatsEvent) => {
      return formatDiff(row.start, row.traversalComplete);
    },
  },
  {
    key: 'snapshotComplete',
    title: 'Snapshot time (Main thread)',
    onRender: (row: PerfStatsEvent) => {
      return formatDiff(row.traversalComplete, row.snapshotComplete);
    },
  },
  {
    key: 'queuingComplete',
    title: 'Queuing time',
    onRender: (row: PerfStatsEvent) => {
      return formatDiff(row.snapshotComplete, row.queuingComplete);
    },
  },
  {
    key: 'deferredComputationComplete',
    title: 'Deferred processing time',
    onRender: (row: PerfStatsEvent) => {
      return formatDiff(row.queuingComplete, row.deferredComputationComplete);
    },
  },
  {
    key: 'serializationComplete',
    title: 'Serialization time',
    onRender: (row: PerfStatsEvent) => {
      return formatDiff(
        row.deferredComputationComplete,
        row.serializationComplete,
      );
    },
  },
  {
    key: 'socketComplete',
    title: 'Socket send time',
    onRender: (row: PerfStatsEvent) => {
      return formatDiff(row.serializationComplete, row.socketComplete);
    },
  },
];

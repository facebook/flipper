/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useState} from 'react';
import {PerfStatsEvent, plugin} from '../index';
import {
  DataInspector,
  DataTable,
  DataTableColumn,
  DetailSidebar,
  Layout,
  usePlugin,
  useValue,
} from 'flipper-plugin';
import {Tree, Typography} from 'antd';
import type {DataNode} from 'antd/es/tree';
import {DownOutlined} from '@ant-design/icons';
import {useHotkeys} from 'react-hotkeys-hook';
import {Id, UINode} from '../types';

function nodesToAntTree(root: Id, nodes: Map<Id, UINode>): [DataNode, Id[]] {
  const inactive: Id[] = [];

  function uiNodeToAntNode(id: Id): DataNode {
    const node = nodes.get(id);

    if (node?.activeChild) {
      for (const child of node.children) {
        if (child !== node?.activeChild) {
          inactive.push(child);
        }
      }
    }

    return {
      key: id,
      title: node?.name,
      children: node?.children.map((id) => uiNodeToAntNode(id)),
    };
  }

  return [uiNodeToAntNode(root), inactive];
}

function formatDiff(start: number, end: number): string {
  const ms = end - start;
  return `${ms.toFixed(0)}ms`;
}

export const columns: DataTableColumn<PerfStatsEvent>[] = [
  {
    key: 'txId',
    title: 'TXID',
  },
  {
    key: 'nodesCount',
    title: 'Total nodes',
  },
  {
    key: 'start',
    title: 'Start',
    onRender: (row: PerfStatsEvent) => {
      console.log(row.start);
      return new Date(row.start).toISOString();
    },
  },
  {
    key: 'scanComplete',
    title: 'Scan time',
    onRender: (row: PerfStatsEvent) => {
      return formatDiff(row.start, row.scanComplete);
    },
  },
  {
    key: 'serializationComplete',
    title: 'Serialization time',
    onRender: (row: PerfStatsEvent) => {
      return formatDiff(row.scanComplete, row.serializationComplete);
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

export function Component() {
  const instance = usePlugin(plugin);
  const rootId = useValue(instance.rootId);
  const nodes = useValue(instance.nodes);

  const [showPerfStats, setShowPerfStats] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | undefined>(
    undefined,
  );

  useHotkeys('ctrl+i', () => setShowPerfStats((show) => !show));

  function renderAttributesInspector(node: UINode | undefined) {
    if (!node) {
      return;
    }
    return (
      <>
        <DetailSidebar>
          <Layout.Container gap pad>
            <Typography.Title level={2}>Attributes Inspector</Typography.Title>
            <DataInspector data={node.attributes} expandRoot />
          </Layout.Container>
        </DetailSidebar>
      </>
    );
  }

  if (showPerfStats)
    return (
      <DataTable<PerfStatsEvent>
        dataSource={instance.perfEvents}
        columns={columns}
      />
    );

  if (rootId) {
    const [antTree, inactive] = nodesToAntTree(rootId, nodes);
    return (
      <>
        <Layout.ScrollContainer>
          <Tree
            showIcon
            showLine
            onSelect={(selected) => {
              setSelectedNode(selected[0] as string);
            }}
            defaultExpandAll
            expandedKeys={[...nodes.keys()].filter(
              (key) => !inactive.includes(key),
            )}
            switcherIcon={<DownOutlined />}
            treeData={[antTree]}
          />
        </Layout.ScrollContainer>
        {selectedNode && renderAttributesInspector(nodes.get(selectedNode))}
      </>
    );
  }

  return <div>Nothing yet</div>;
}

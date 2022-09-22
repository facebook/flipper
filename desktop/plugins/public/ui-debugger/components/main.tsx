/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useState} from 'react';
import {plugin} from '../index';
import {
  DataInspector,
  DetailSidebar,
  Layout,
  usePlugin,
  useValue,
} from 'flipper-plugin';
import {Typography} from 'antd';

import {useHotkeys} from 'react-hotkeys-hook';
import {Id, UINode} from '../types';
import {PerfStats} from './PerfStats';
import {Tree} from './Tree';
import {Visualization2D} from './Visualization2D';
import {useKeyboardModifiers} from '../hooks/useKeyboardModifiers';

export function Component() {
  const instance = usePlugin(plugin);
  const rootId = useValue(instance.rootId);
  const nodes: Map<Id, UINode> = useValue(instance.nodes);

  const [showPerfStats, setShowPerfStats] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Id | undefined>(undefined);
  const [hoveredNode, setHoveredNode] = useState<Id | undefined>(undefined);

  useHotkeys('ctrl+i', () => setShowPerfStats((show) => !show));

  const {ctrlPressed} = useKeyboardModifiers();

  function renderAttributesInspector(node: UINode | undefined) {
    if (!node) {
      return;
    }
    return (
      <>
        <DetailSidebar>
          <Layout.Container gap pad>
            <Typography.Title level={2}>Attributes Inspector</Typography.Title>
            <DataInspector data={node} expandRoot />
          </Layout.Container>
        </DetailSidebar>
      </>
    );
  }

  if (showPerfStats) return <PerfStats events={instance.perfEvents} />;

  if (rootId) {
    return (
      <>
        <Layout.ScrollContainer>
          <Layout.Horizontal>
            <Tree
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              onHoveredNode={setHoveredNode}
              nodes={nodes}
              rootId={rootId}
            />
            <Visualization2D
              root={rootId}
              nodes={nodes}
              hoveredNode={hoveredNode}
              onHoverNode={setHoveredNode}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              modifierPressed={ctrlPressed}
            />
          </Layout.Horizontal>
        </Layout.ScrollContainer>
        {selectedNode && renderAttributesInspector(nodes.get(selectedNode))}
      </>
    );
  }

  return <div>Nothing yet</div>;
}

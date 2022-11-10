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
import {DetailSidebar, Layout, usePlugin, useValue} from 'flipper-plugin';
import {useHotkeys} from 'react-hotkeys-hook';
import {Id, Metadata, MetadataId, Snapshot, UINode} from '../types';
import {PerfStats} from './PerfStats';
import {Tree} from './Tree';
import {Visualization2D} from './Visualization2D';
import {useKeyboardModifiers} from '../hooks/useKeyboardModifiers';
import {Inspector} from './sidebar/Inspector';

export function Component() {
  const instance = usePlugin(plugin);
  const rootId = useValue(instance.rootId);
  const nodes: Map<Id, UINode> = useValue(instance.nodes);
  const metadata: Map<MetadataId, Metadata> = useValue(instance.metadata);
  const snapshots: Map<Id, Snapshot> = useValue(instance.snapshots);

  const [showPerfStats, setShowPerfStats] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Id | undefined>(undefined);
  const [hoveredNode, setHoveredNode] = useState<Id | undefined>(undefined);

  useHotkeys('ctrl+i', () => setShowPerfStats((show) => !show));

  const {ctrlPressed} = useKeyboardModifiers();

  function renderSidebar(
    node: UINode | undefined,
    metadata: Map<MetadataId, Metadata>,
  ) {
    if (!node) {
      return;
    }
    return (
      <DetailSidebar width={350}>
        <Inspector metadata={metadata} node={node} />
      </DetailSidebar>
    );
  }

  if (showPerfStats) return <PerfStats events={instance.perfEvents} />;

  if (rootId) {
    return (
      <Layout.Horizontal grow>
        <Layout.ScrollContainer>
          <Tree
            selectedNode={selectedNode}
            hoveredNode={hoveredNode}
            onSelectNode={setSelectedNode}
            onHoveredNode={setHoveredNode}
            nodes={nodes}
            rootId={rootId}
          />
        </Layout.ScrollContainer>
        <Visualization2D
          rootId={rootId}
          nodes={nodes}
          snapshots={snapshots}
          hoveredNode={hoveredNode}
          onHoverNode={setHoveredNode}
          selectedNode={selectedNode}
          onSelectNode={setSelectedNode}
          modifierPressed={ctrlPressed}
        />
        {selectedNode && renderSidebar(nodes.get(selectedNode), metadata)}
      </Layout.Horizontal>
    );
  }

  return <div>Loading...</div>;
}

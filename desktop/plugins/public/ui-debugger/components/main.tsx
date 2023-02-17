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
  DetailSidebar,
  Layout,
  usePlugin,
  useValue,
  _Sidebar as ResizablePanel,
} from 'flipper-plugin';
import {useHotkeys} from 'react-hotkeys-hook';
import {Id, Metadata, MetadataId, UINode} from '../types';
import {PerfStats} from './PerfStats';
import {Visualization2D} from './Visualization2D';
import {useKeyboardModifiers} from '../hooks/useKeyboardModifiers';
import {Inspector} from './sidebar/Inspector';
import {Controls} from './Controls';
import {Spin} from 'antd';
import {QueryClientProvider} from 'react-query';
import FeedbackRequest from './fb-stubs/feedback';
import {Tree2} from './Tree';

export function Component() {
  const instance = usePlugin(plugin);
  const rootId = useValue(instance.rootId);
  const nodes: Map<Id, UINode> = useValue(instance.nodes);
  const metadata: Map<MetadataId, Metadata> = useValue(instance.metadata);

  const [showPerfStats, setShowPerfStats] = useState(false);

  const [visualiserWidth, setVisualiserWidth] = useState(500);

  useHotkeys('ctrl+i', () => setShowPerfStats((show) => !show));

  const {ctrlPressed} = useKeyboardModifiers();

  if (showPerfStats) return <PerfStats events={instance.perfEvents} />;

  if (rootId) {
    return (
      <QueryClientProvider client={instance.queryClient}>
        <Layout.Container grow padh="small" padv="medium">
          {instance.device === 'iOS' ? <FeedbackRequest /> : null}
          <Controls />
          <Layout.Horizontal grow pad="small">
            <Tree2 nodes={nodes} rootId={rootId} />

            <ResizablePanel
              position="right"
              minWidth={200}
              width={visualiserWidth}
              maxWidth={800}
              onResize={(width) => {
                setVisualiserWidth(width);
              }}
              gutter>
              <Visualization2D
                rootId={rootId}
                width={visualiserWidth}
                nodes={nodes}
                onSelectNode={instance.uiActions.onSelectNode}
                modifierPressed={ctrlPressed}
              />
            </ResizablePanel>
            <DetailSidebar width={350}>
              <Inspector metadata={metadata} nodes={nodes} />
            </DetailSidebar>
          </Layout.Horizontal>
        </Layout.Container>
      </QueryClientProvider>
    );
  }

  return (
    <Centered>
      <Spin data-testid="loading-indicator" />
    </Centered>
  );
}

export function Centered(props: {children: React.ReactNode}) {
  return (
    <Layout.Horizontal center grow>
      <Layout.Container center grow>
        {props.children}
      </Layout.Container>
    </Layout.Horizontal>
  );
}

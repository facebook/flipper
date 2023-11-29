/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {ReactNode, useEffect, useRef, useState} from 'react';
import {plugin} from '../index';
import {
  DetailSidebar,
  Layout,
  usePlugin,
  useValue,
  _Sidebar as ResizablePanel,
  theme,
} from 'flipper-plugin';
import {useHotkeys} from 'react-hotkeys-hook';
import {Id, Metadata, MetadataId, ClientNode} from '../ClientTypes';
import {PerfStats} from './PerfStats';
import {Visualization2D} from './visualizer/Visualization2D';
import {TreeControls} from './tree/TreeControls';
import {Button, Spin, Typography} from 'antd';
import {QueryClientProvider} from 'react-query';
import {Tree2} from './tree/Tree';
import {StreamInterceptorErrorView} from './StreamInterceptorErrorView';
import {queryClient} from '../utils/reactQuery';
import {FrameworkEventsTable} from './FrameworkEventsTable';
import {Centered} from './shared/Centered';
import {SidebarV2} from './sidebarV2/SidebarV2';
import {getNode} from '../utils/map';

export function Component() {
  const instance = usePlugin(plugin);
  const rootId = useValue(instance.rootId);
  const streamState = useValue(instance.uiState.streamState);
  const visualiserWidth = useValue(instance.uiState.visualiserWidth);
  const nodes: Map<Id, ClientNode> = useValue(instance.nodes);
  const metadata: Map<MetadataId, Metadata> = useValue(instance.metadata);
  const selectedNodeId = useValue(instance.uiState.selectedNode);

  const [showPerfStats, setShowPerfStats] = useState(false);

  useHotkeys('ctrl+i', () => setShowPerfStats((show) => !show));

  const viewMode = useValue(instance.uiState.viewMode);
  const [bottomPanel, setBottomPanel] = useState<
    {title: string; component: ReactNode} | undefined
  >();
  const openBottomPanelWithContent = (title: string, component: ReactNode) => {
    setBottomPanel({title, component});
  };
  const dismissBottomPanel = () => {
    setBottomPanel(undefined);
  };

  const [bottomPanelHeight, setBottomPanelHeight] = useState(400);

  if (showPerfStats)
    return (
      <PerfStats
        frameworkEvents={instance.frameworkEvents}
        uiState={instance.uiState}
        rootId={rootId}
        nodes={nodes}
        events={instance.perfEvents}
      />
    );

  if (streamState.state === 'FatalError') {
    return (
      <StreamInterceptorErrorView
        title="Fatal Error"
        message={`Something has gone horribly wrong, we are aware of this and are looking into it, details ${streamState.error.name} ${streamState.error.message}`}
        button={
          <Button onClick={streamState.clearCallBack} type="primary">
            Reset
          </Button>
        }
      />
    );
  }

  if (streamState.state === 'StreamInterceptorRetryableError') {
    return (
      <StreamInterceptorErrorView
        message={streamState.error.message}
        title={streamState.error.title}
        button={
          <Button onClick={streamState.retryCallback} type="primary">
            Retry
          </Button>
        }
      />
    );
  }

  if (rootId == null || streamState.state === 'RetryingAfterError') {
    return (
      <Centered>
        <Spin data-testid="loading-indicator" />
      </Centered>
    );
  }

  if (viewMode.mode === 'frameworkEventsTable') {
    return (
      <FrameworkEventsTable
        nodeId={viewMode.nodeId}
        isTree={viewMode.isTree}
        nodes={nodes}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Layout.Container grow>
        <Layout.Horizontal
          grow
          style={{
            borderRadius: theme.borderRadius,
            backgroundColor: theme.backgroundWash,
          }}>
          <Layout.Container
            grow
            style={{
              borderRadius: theme.borderRadius,
              backgroundColor: theme.backgroundDefault,
            }}>
            <TreeControls />
            <Tree2
              additionalHeightOffset={
                bottomPanel != null ? bottomPanelHeight : 0
              }
              nodes={nodes}
              metadata={metadata}
              rootId={rootId}
            />
          </Layout.Container>

          <ResizablePanel
            position="right"
            minWidth={200}
            width={visualiserWidth + theme.space.large}
            maxWidth={800}
            onResize={(width) => {
              instance.uiActions.setVisualiserWidth(width);
            }}
            gutter>
            <Visualization2D
              width={visualiserWidth}
              nodes={nodes}
              onSelectNode={instance.uiActions.onSelectNode}
            />
          </ResizablePanel>
          <DetailSidebar width={450}>
            <SidebarV2
              metadata={metadata}
              selectedNode={getNode(selectedNodeId?.id, nodes)}
              showBottomPanel={openBottomPanelWithContent}
            />
          </DetailSidebar>
        </Layout.Horizontal>
        {bottomPanel && (
          <BottomPanel
            title={bottomPanel.title}
            height={bottomPanelHeight}
            setHeight={setBottomPanelHeight}
            dismiss={dismissBottomPanel}>
            {bottomPanel.component}
          </BottomPanel>
        )}
      </Layout.Container>
    </QueryClientProvider>
  );
}

type BottomPanelProps = {
  title: string;
  dismiss: () => void;
  children: React.ReactNode;
  height: number;
  setHeight: (height: number) => void;
};
export function BottomPanel({
  title,
  dismiss,
  children,
  height,
  setHeight,
}: BottomPanelProps) {
  const bottomPanelRef = useRef<any>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        bottomPanelRef.current &&
        !bottomPanelRef.current.contains(event.target)
      ) {
        setTimeout(() => {
          //push to back of event queue so that you can still select item in the tree
          dismiss();
        }, 0);
      }
    };
    // Add event listener when the component is mounted.
    document.addEventListener('mousedown', handleClickOutside);

    // Remove event listener when component is unmounted.
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [bottomPanelRef, dismiss]);

  if (!children) {
    return <></>;
  }

  return (
    <div ref={bottomPanelRef}>
      <ResizablePanel
        position="bottom"
        minHeight={200}
        height={height}
        onResize={(_, height) => setHeight(height)}
        gutter>
        <Layout.Container grow>
          <Layout.Horizontal
            center
            pad="small"
            style={{
              justifyContent: 'space-between',
            }}>
            <Typography.Title level={3}>{title}</Typography.Title>
            <Button type="ghost" onClick={dismiss}>
              Dismiss
            </Button>
          </Layout.Horizontal>
          <Layout.ScrollContainer pad="small">
            {children}
          </Layout.ScrollContainer>
        </Layout.Container>
      </ResizablePanel>
    </div>
  );
}

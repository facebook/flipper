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
import {Visualization2D} from './Visualization2D';
import {Inspector} from './sidebar/Inspector';
import {Controls} from './Controls';
import {Button, Spin} from 'antd';
import {QueryClientProvider} from 'react-query';
import {Tree2} from './tree/Tree';
import {StreamInterceptorErrorView} from './StreamInterceptorErrorView';
import {queryClient} from '../utils/reactQuery';
import {FrameworkEventsTable} from './FrameworkEventsTable';

export function Component() {
  const instance = usePlugin(plugin);
  const rootId = useValue(instance.rootId);
  const streamState = useValue(instance.uiState.streamState);
  const visualiserWidth = useValue(instance.uiState.visualiserWidth);
  const nodes: Map<Id, ClientNode> = useValue(instance.nodes);
  const metadata: Map<MetadataId, Metadata> = useValue(instance.metadata);

  const [showPerfStats, setShowPerfStats] = useState(false);

  useHotkeys('ctrl+i', () => setShowPerfStats((show) => !show));

  const viewMode = useValue(instance.uiState.viewMode);
  const [bottomPanelComponent, setBottomPanelComponent] = useState<
    ReactNode | undefined
  >();
  const openBottomPanelWithContent = (component: ReactNode) => {
    setBottomPanelComponent(component);
  };
  const dismissBottomPanel = () => {
    setBottomPanelComponent(undefined);
  };

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
    return <FrameworkEventsTable rootTreeId={viewMode.treeRootId} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
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
          <Controls />
          <Tree2 nodes={nodes} rootId={rootId} />
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
        <DetailSidebar width={350}>
          <Inspector
            os={instance.os}
            metadata={metadata}
            nodes={nodes}
            showExtra={openBottomPanelWithContent}
          />
        </DetailSidebar>
        <BottomPanel dismiss={dismissBottomPanel}>
          {bottomPanelComponent}
        </BottomPanel>
      </Layout.Horizontal>
    </QueryClientProvider>
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

type BottomPanelProps = {
  dismiss: () => void;
  children: React.ReactNode;
};
export function BottomPanel({dismiss, children}: BottomPanelProps) {
  const bottomPanelRef = useRef<any>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        bottomPanelRef.current &&
        !bottomPanelRef.current.contains(event.target)
      ) {
        dismiss();
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
      <ResizablePanel position="bottom" minHeight={200} height={400} gutter>
        <Layout.ScrollContainer>{children}</Layout.ScrollContainer>
        <div style={{margin: 10}}>
          <Button type="ghost" style={{float: 'right'}} onClick={dismiss}>
            Dismiss
          </Button>
        </div>
      </ResizablePanel>
    </div>
  );
}

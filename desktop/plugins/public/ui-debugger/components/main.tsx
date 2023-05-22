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
import {Id, Metadata, MetadataId, UINode} from '../types';
import {PerfStats} from './PerfStats';
import {Visualization2D} from './Visualization2D';
import {Inspector} from './sidebar/Inspector';
import {Controls} from './Controls';
import {Button, Spin} from 'antd';
import {QueryClientProvider} from 'react-query';
import {Tree2} from './Tree';
import {StreamInterceptorErrorView} from './StreamInterceptorErrorView';

export function Component() {
  const instance = usePlugin(plugin);
  const rootId = useValue(instance.rootId);
  const streamState = useValue(instance.uiState.streamState);
  const visualiserWidth = useValue(instance.uiState.visualiserWidth);
  const nodes: Map<Id, UINode> = useValue(instance.nodes);
  const metadata: Map<MetadataId, Metadata> = useValue(instance.metadata);

  const [showPerfStats, setShowPerfStats] = useState(false);

  useHotkeys('ctrl+i', () => setShowPerfStats((show) => !show));

  const [bottomPanelComponent, setBottomPanelComponent] = useState<
    ReactNode | undefined
  >();
  const openBottomPanelWithContent = (component: ReactNode) => {
    setBottomPanelComponent(component);
  };
  const dismissBottomPanel = () => {
    setBottomPanelComponent(undefined);
  };

  if (streamState.state === 'UnrecoverableError') {
    return (
      <StreamInterceptorErrorView
        title="Oops"
        message="Something has gone horribly wrong, we are aware of this and are looking into it"
      />
    );
  }

  if (streamState.state === 'StreamInterceptorRetryableError') {
    return (
      <StreamInterceptorErrorView
        message={streamState.error.message}
        title={streamState.error.title}
        retryCallback={streamState.retryCallback}
      />
    );
  }

  if (showPerfStats) return <PerfStats events={instance.perfEvents} />;

  if (rootId == null || streamState.state === 'RetryingAfterError') {
    return (
      <Centered>
        <Spin data-testid="loading-indicator" />
      </Centered>
    );
  } else {
    return (
      <QueryClientProvider client={instance.queryClient}>
        <Layout.Container grow padh="small" padv="medium">
          <Layout.Top>
            <>
              <Controls />
              <Layout.Horizontal grow pad="small">
                <Tree2 nodes={nodes} rootId={rootId} />

                <ResizablePanel
                  position="right"
                  minWidth={200}
                  width={visualiserWidth + theme.space.large}
                  maxWidth={800}
                  onResize={(width) => {
                    instance.uiActions.setVisualiserWidth(width);
                  }}
                  gutter>
                  <Layout.ScrollContainer vertical>
                    <Visualization2D
                      width={visualiserWidth}
                      nodes={nodes}
                      onSelectNode={instance.uiActions.onSelectNode}
                    />
                  </Layout.ScrollContainer>
                </ResizablePanel>
                <DetailSidebar width={350}>
                  <Inspector
                    metadata={metadata}
                    nodes={nodes}
                    showExtra={openBottomPanelWithContent}
                  />
                </DetailSidebar>
              </Layout.Horizontal>
            </>
            <BottomPanel dismiss={dismissBottomPanel}>
              {bottomPanelComponent}
            </BottomPanel>
          </Layout.Top>
        </Layout.Container>
      </QueryClientProvider>
    );
  }
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

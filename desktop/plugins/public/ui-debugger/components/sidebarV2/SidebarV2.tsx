/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {MetadataId, Metadata, NodeMap} from '../../ClientTypes';
import {plugin} from '../../index';
import React, {ReactNode, useState} from 'react';
import {Layout, Tab, Tabs, usePlugin, useValue} from 'flipper-plugin';
import {NoData} from './NoData';
import {Tooltip} from 'antd';
import {AttributesInspector} from './attributes/AttributesInspector';
import {FrameworkEventsInspector} from './frameworkevents/FrameworkEventsInspector';
import {getNode} from '../../utils/map';
import {NodeSelection} from '../../DesktopTypes';

type Props = {
  nodeSelection?: NodeSelection;
  nodes: NodeMap;
  metadata: Map<MetadataId, Metadata>;
  showBottomPanel: (title: string, element: ReactNode) => void;
};
export function SidebarV2({
  nodeSelection,
  nodes,
  metadata,
  showBottomPanel,
}: Props) {
  const instance = usePlugin(plugin);

  const frameworkEventMetadata = useValue(instance.frameworkEventMetadata);

  const [_, reRender] = useState(0);
  if (!nodeSelection) {
    return <NoData message="Please select a node to view its details" />;
  }

  const selectedFrameworkEvents = nodeSelection
    ? instance.frameworkEvents.getAllRecordsByIndex({
        nodeId: nodeSelection.node.id,
      })
    : [];

  //when select node not in frame, dont show data as its stale
  const actualNode = getNode(nodeSelection.node.id, nodes);
  return (
    <Layout.Container gap pad>
      <Tabs
        localStorageKeyOverride="sidebar-tabs"
        grow
        centered
        key={nodeSelection?.node?.id}>
        <Tab tab={<Tooltip title="Attributes">Attributes</Tooltip>}>
          {actualNode == null ? (
            <NoData message="Node is no longer on screen" />
          ) : (
            <AttributesInspector node={actualNode} metadata={metadata} />
          )}
        </Tab>
        {selectedFrameworkEvents?.length > 0 && (
          <Tab
            key={'events'}
            tab={
              <Tooltip title="Events">
                <Layout.Horizontal center>Events</Layout.Horizontal>
              </Tooltip>
            }>
            <FrameworkEventsInspector
              clearAllEvents={() => {
                instance.frameworkEvents.clear();
                reRender((x) => x + 1);
              }}
              onSetViewMode={instance.uiActions.onSetViewMode}
              frameworkEventMetadata={frameworkEventMetadata}
              node={nodeSelection.node}
              events={selectedFrameworkEvents}
              showBottomPanel={showBottomPanel}
            />
          </Tab>
        )}
      </Tabs>
    </Layout.Container>
  );
}

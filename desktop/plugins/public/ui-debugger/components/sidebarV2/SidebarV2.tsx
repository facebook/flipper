/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ClientNode, MetadataId, Metadata} from '../../ClientTypes';
import {plugin} from '../../index';
import React, {ReactNode} from 'react';
import {Layout, Tab, Tabs, usePlugin, useValue} from 'flipper-plugin';
import {NoData} from '../sidebar/inspector/NoData';
import {Tooltip} from 'antd';
import {AttributesInspector} from './AttributesInspector';
import {FrameworkEventsInspector} from '../sidebar/inspector/FrameworkEventsInspector';

type Props = {
  selectedNode?: ClientNode;
  metadata: Map<MetadataId, Metadata>;
  showBottomPanel: (title: string, element: ReactNode) => void;
};
export function SidebarV2({selectedNode, metadata, showBottomPanel}: Props) {
  const instance = usePlugin(plugin);

  const frameworkEventMetadata = useValue(instance.frameworkEventMetadata);

  if (!selectedNode) {
    return <NoData message="Please select a node to view its details" />;
  }
  const selectedFrameworkEvents = selectedNode.id
    ? instance.frameworkEvents.getAllRecordsByIndex({nodeId: selectedNode.id})
    : [];

  return (
    <Layout.Container gap pad>
      <Tabs
        localStorageKeyOverride="sidebar-tabs"
        grow
        centered
        key={selectedNode.id}>
        <Tab tab={<Tooltip title="Attributes">Attributes</Tooltip>}>
          <AttributesInspector node={selectedNode} metadata={metadata} />
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
              onSetViewMode={instance.uiActions.onSetViewMode}
              frameworkEventMetadata={frameworkEventMetadata}
              node={selectedNode}
              events={selectedFrameworkEvents}
              showBottomPanel={showBottomPanel}
            />
          </Tab>
        )}
      </Tabs>
    </Layout.Container>
  );
}

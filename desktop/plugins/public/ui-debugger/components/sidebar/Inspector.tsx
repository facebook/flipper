/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {ReactNode} from 'react';
// eslint-disable-next-line rulesdir/no-restricted-imports-clone
import {Glyph} from 'flipper';
import {
  DeviceOS,
  Layout,
  Tab,
  Tabs,
  theme,
  usePlugin,
  useValue,
} from 'flipper-plugin';
import {Id, Metadata, MetadataId, ClientNode} from '../../ClientTypes';
import {IdentityInspector} from './inspector/IdentityInspector';
import {AttributesInspector} from './inspector/AttributesInspector';
import {Tooltip} from 'antd';
import {NoData} from './inspector/NoData';
import {plugin} from '../../index';
import {FrameworkEventsInspector} from './inspector/FrameworkEventsInspector';
import {DashboardOutlined} from '@ant-design/icons';

type Props = {
  os: DeviceOS;
  nodes: Map<Id, ClientNode>;
  metadata: Map<MetadataId, Metadata>;
  showExtra: (title: string, element: ReactNode) => void;
};

export const Inspector: React.FC<Props> = ({
  os,
  nodes,
  metadata,
  showExtra,
}) => {
  const instance = usePlugin(plugin);
  const selectedNodeId = useValue(instance.uiState.selectedNode)?.id;

  const frameworkEventMetadata = useValue(instance.frameworkEventMetadata);
  const selectedNode = selectedNodeId ? nodes.get(selectedNodeId) : undefined;
  if (!selectedNode) {
    return <NoData message="Please select a node to view its details" />;
  }

  const selectedFrameworkEvents = selectedNodeId
    ? instance.frameworkEvents.getAllRecordsByIndex({nodeId: selectedNodeId})
    : [];

  return (
    <Layout.Container gap pad>
      <Tabs
        localStorageKeyOverride="sidebar-tabs"
        grow
        centered
        key={selectedNodeId}>
        <Tab
          key={'identity'}
          tab={
            <Tooltip title="Identity">
              <Layout.Horizontal center>
                <Glyph name="badge" size={16} color={theme.primaryColor} />
              </Layout.Horizontal>
            </Tooltip>
          }>
          <IdentityInspector node={selectedNode} />
        </Tab>

        <Tab
          key={'attributes'}
          tab={
            <Tooltip title="Attributes">
              <Layout.Horizontal center>
                <Glyph name="data-table" size={16} color={theme.primaryColor} />
              </Layout.Horizontal>
            </Tooltip>
          }>
          <AttributesInspector
            mode="attribute"
            node={selectedNode}
            metadata={metadata}
          />
        </Tab>
        {os !== 'Android' && (
          <Tab
            key={'layout'}
            tab={
              <Tooltip title="Layout">
                <Layout.Horizontal center>
                  <Glyph
                    name="square-ruler"
                    size={16}
                    color={theme.primaryColor}
                  />
                </Layout.Horizontal>
              </Tooltip>
            }>
            <AttributesInspector
              mode="layout"
              node={selectedNode}
              metadata={metadata}
            />
          </Tab>
        )}
        {selectedFrameworkEvents?.length > 0 && (
          <Tab
            key={'events'}
            tab={
              <Tooltip title="Events">
                <Layout.Horizontal center>
                  <DashboardOutlined
                    style={{color: theme.primaryColor, fontSize: 16}}
                  />
                </Layout.Horizontal>
              </Tooltip>
            }>
            <FrameworkEventsInspector
              onSetViewMode={instance.uiActions.onSetViewMode}
              frameworkEventMetadata={frameworkEventMetadata}
              node={selectedNode}
              events={selectedFrameworkEvents}
              showBottomPanel={showExtra}
            />
          </Tab>
        )}
      </Tabs>
    </Layout.Container>
  );
};

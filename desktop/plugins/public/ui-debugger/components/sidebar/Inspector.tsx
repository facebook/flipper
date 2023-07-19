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
import {Id, Metadata, MetadataId, UINode} from '../../types';
import {IdentityInspector} from './inspector/IdentityInspector';
import {AttributesInspector} from './inspector/AttributesInspector';
import {Tooltip} from 'antd';
import {NoData} from './inspector/NoData';
import {plugin} from '../../index';
import {FrameworkEventsInspector} from './inspector/FrameworkEventsInspector';

type Props = {
  os: DeviceOS;
  nodes: Map<Id, UINode>;
  metadata: Map<MetadataId, Metadata>;
  showExtra: (element: ReactNode) => void;
};

export const Inspector: React.FC<Props> = ({
  os,
  nodes,
  metadata,
  showExtra,
}) => {
  const instance = usePlugin(plugin);
  const selectedNodeId = useValue(instance.uiState.selectedNode)?.id;
  const frameworkEvents = useValue(instance.frameworkEvents);

  const selectedNode = selectedNodeId ? nodes.get(selectedNodeId) : undefined;
  if (!selectedNode) {
    return <NoData message="Please select a node to view its details" />;
  }

  const selectedFrameworkEvents = selectedNodeId
    ? frameworkEvents?.get(selectedNodeId)
    : undefined;

  return (
    <Layout.Container gap pad>
      <Tabs grow centered key={selectedNodeId}>
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
        {selectedFrameworkEvents && (
          <Tab
            key={'events'}
            tab={
              <Tooltip title="Events">
                <Layout.Horizontal center>
                  <Glyph
                    name="weather-thunder"
                    size={16}
                    color={theme.primaryColor}
                  />
                </Layout.Horizontal>
              </Tooltip>
            }>
            <FrameworkEventsInspector
              node={selectedNode}
              events={selectedFrameworkEvents}
              showExtra={showExtra}
            />
          </Tab>
        )}
      </Tabs>
    </Layout.Container>
  );
};

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
// eslint-disable-next-line rulesdir/no-restricted-imports-clone
import {Glyph} from 'flipper';
import {
  Layout,
  Tab,
  Tabs,
  theme,
  usePlugin,
  useValue,
  TimelineDataDescription,
} from 'flipper-plugin';

import {Id, Metadata, MetadataId, UINode} from '../../types';

import {IdentityInspector} from './inspector/IdentityInspector';
import {AttributesInspector} from './inspector/AttributesInspector';
import {Tooltip} from 'antd';
import {NoData} from './inspector/NoData';
import {plugin} from '../../index';

type Props = {
  nodes: Map<Id, UINode>;
  metadata: Map<MetadataId, Metadata>;
};

export const Inspector: React.FC<Props> = ({nodes, metadata}) => {
  const instance = usePlugin(plugin);
  const selectedNodeId = useValue(instance.uiState.selectedNode);
  const frameworkEvents = useValue(instance.frameworkEvents);

  const selectedNode = selectedNodeId ? nodes.get(selectedNodeId) : undefined;
  if (!selectedNode) {
    return <NoData message="Please select a node to view its details" />;
  }

  const events = selectedNodeId
    ? frameworkEvents?.get(selectedNodeId)
    : undefined;

  return (
    <Layout.Container gap pad>
      <Tabs grow centered>
        <Tab
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
        <Tab
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
        {events && (
          <Tab
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
            <TimelineDataDescription
              timeline={{
                time: events.map((e) => {
                  return {
                    moment: e.timestamp,
                    display: e.type.slice(e.type.lastIndexOf(':') + 1),
                    color: theme.primaryColor,
                    key: e.timestamp.toString(),
                  };
                }),
                current: '',
              }}
            />
          </Tab>
        )}
      </Tabs>
    </Layout.Container>
  );
};

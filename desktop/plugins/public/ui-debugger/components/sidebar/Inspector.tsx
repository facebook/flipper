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
import {Layout, Tab, Tabs} from 'flipper-plugin';
import {Metadata, MetadataId, UINode} from '../../types';
import {IdentityInspector} from './inspector/IdentityInspector';
import {AttributesInspector} from './inspector/AttributesInspector';
import {Tooltip} from 'antd';
import {NoData} from './inspector/NoData';

type Props = {
  node?: UINode;
  metadata: Map<MetadataId, Metadata>;
};

export const Inspector: React.FC<Props> = ({node, metadata}) => {
  if (!node) {
    return <NoData message="Please select a node to view its details" />;
  }
  return (
    <Layout.Container gap pad>
      <Tabs grow centered>
        <Tab
          tab={
            <Tooltip title="Identity">
              <Layout.Horizontal center>
                <Glyph name="badge" size={16} />
              </Layout.Horizontal>
            </Tooltip>
          }>
          <IdentityInspector node={node} />
        </Tab>

        <Tab
          tab={
            <Tooltip title="Attributes">
              <Layout.Horizontal center>
                <Glyph name="data-table" size={16} />
              </Layout.Horizontal>
            </Tooltip>
          }>
          <AttributesInspector
            mode="attribute"
            node={node}
            metadata={metadata}
          />
        </Tab>
        <Tab
          tab={
            <Tooltip title="Layout">
              <Layout.Horizontal center>
                <Glyph name="square-ruler" size={16} />
              </Layout.Horizontal>
            </Tooltip>
          }>
          <AttributesInspector mode="layout" node={node} metadata={metadata} />
        </Tab>
      </Tabs>
    </Layout.Container>
  );
};

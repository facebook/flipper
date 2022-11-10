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
import {DocumentationInspector} from './inspector/DocumentationInspector';

type Props = {
  node: UINode;
  metadata: Map<MetadataId, Metadata>;
};

export const Inspector: React.FC<Props> = ({node, metadata}) => {
  return (
    <Layout.Container gap pad>
      <Tabs grow centered>
        <Tab
          tab={
            <Layout.Horizontal center>
              <Glyph name="badge" size={16} />
            </Layout.Horizontal>
          }>
          <IdentityInspector node={node} />
        </Tab>
        <Tab
          tab={
            <Layout.Horizontal center>
              <Glyph name="data-table" size={16} />
            </Layout.Horizontal>
          }>
          <AttributesInspector
            mode="attribute"
            node={node}
            metadata={metadata}
          />
        </Tab>
        <Tab
          tab={
            <Layout.Horizontal center>
              <Glyph name="square-ruler" size={16} />
            </Layout.Horizontal>
          }>
          <AttributesInspector mode="layout" node={node} metadata={metadata} />
        </Tab>
        <Tab
          tab={
            <Layout.Horizontal center>
              <Glyph name="info-circle" size={16} />
            </Layout.Horizontal>
          }>
          <DocumentationInspector node={node} />
        </Tab>
      </Tabs>
    </Layout.Container>
  );
};

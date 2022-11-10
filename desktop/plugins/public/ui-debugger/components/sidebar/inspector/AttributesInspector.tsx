/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {
  Inspectable,
  InspectableObject,
  Metadata,
  MetadataId,
  UINode,
} from '../../../types';
import {DataInspector, Panel, styled} from 'flipper-plugin';
import {Checkbox, Col, Row} from 'antd';
import {displayableName} from '../utilities/displayableName';
import ColorInspector from './ColorInspector';
import SizeInspector from './SizeInspector';
import {theme} from 'flipper-plugin';
import SpaceBoxInspector from './SpaceBoxInspector';
import BoundsInspector from './BoundsInspector';
import Coordinate3DInspector from './Coordinate3DInspector';
import CoordinateInspector from './CoordinateInspector';

const NumberValue = styled.span({
  color: theme.semanticColors.numberValue,
  display: 'flex',
});

const TextValue = styled.span({
  color: theme.semanticColors.stringValue,
  display: 'flex',
});

const EnumValue = styled.span({
  color: theme.semanticColors.stringValue,
  fontSize: theme.fontSize.small,
  margin: 'auto',
});

const ContainerStyle = {
  marginTop: 4,
  marginBottom: 4,
  borderStyle: 'solid',
  borderColor: theme.dividerColor,
  borderWidth: '0 0 1px 0',
};

const ObjectContainer = styled.div({
  borderLeftWidth: 5,
  borderLeftColor: 'lightgray',
  borderLeftStyle: 'solid',
});

const CenterContainer = styled.div({
  margin: 'auto',
});
type NamedAttributeInspectorProps = {
  name: string;
};
const NamedAttributeInspector: React.FC<NamedAttributeInspectorProps> = ({
  name,
  children,
}) => {
  return (
    <Row style={ContainerStyle}>
      <Col span={8} style={{margin: 'auto'}}>
        {name}
      </Col>
      <Col span={16}>
        <CenterContainer>{children}</CenterContainer>
      </Col>
    </Row>
  );
};

const ObjectAttributeInspector: React.FC<{
  metadata: Map<MetadataId, Metadata>;
  name: string;
  fields: Record<MetadataId, Inspectable>;
  level: number;
}> = ({metadata, name, fields, level}) => {
  return (
    <div style={ContainerStyle}>
      {name}
      {Object.keys(fields).map(function (key, _) {
        const metadataId: number = Number(key);
        const inspectableValue = fields[metadataId];
        const attributeName = metadata.get(metadataId)?.name ?? '';
        return (
          <ObjectContainer
            key={metadataId}
            style={{
              paddingLeft: level,
            }}>
            {create(metadata, attributeName, inspectableValue, level + 2)}
          </ObjectContainer>
        );
      })}
    </div>
  );
};

function create(
  metadata: Map<MetadataId, Metadata>,
  name: string,
  inspectable: Inspectable,
  level: number = 2,
) {
  switch (inspectable.type) {
    case 'boolean':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <Checkbox checked={inspectable.value} disabled />
        </NamedAttributeInspector>
      );
    case 'enum':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <EnumValue>{inspectable.value.value}</EnumValue>
        </NamedAttributeInspector>
      );
    case 'text':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <TextValue>{inspectable.value}</TextValue>
        </NamedAttributeInspector>
      );
    case 'number':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <NumberValue>{inspectable.value}</NumberValue>
        </NamedAttributeInspector>
      );
    case 'color':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <ColorInspector color={inspectable.value} />
        </NamedAttributeInspector>
      );
    case 'size':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <SizeInspector value={inspectable.value} />
        </NamedAttributeInspector>
      );
    case 'bounds':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <BoundsInspector value={inspectable.value} />
        </NamedAttributeInspector>
      );
    case 'coordinate':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <CoordinateInspector value={inspectable.value} />
        </NamedAttributeInspector>
      );
    case 'coordinate3d':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <Coordinate3DInspector value={inspectable.value} />
        </NamedAttributeInspector>
      );
    case 'space':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <SpaceBoxInspector value={inspectable.value} />
        </NamedAttributeInspector>
      );
    case 'object':
      return (
        <ObjectAttributeInspector
          metadata={metadata}
          name={displayableName(name)}
          fields={inspectable.fields}
          level={level}
        />
      );
    default:
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <TextValue>{JSON.stringify(inspectable)}</TextValue>
        </NamedAttributeInspector>
      );
  }
}

function createSection(
  mode: InspectorMode,
  metadata: Map<MetadataId, Metadata>,
  name: string,
  inspectable: InspectableObject,
) {
  const children: any[] = [];
  Object.keys(inspectable.fields).forEach((key, _index) => {
    const metadataId: number = Number(key);
    const attributeMetadata = metadata.get(metadataId);
    if (attributeMetadata && attributeMetadata.type === mode) {
      const attributeValue = inspectable.fields[metadataId];
      children.push(create(metadata, attributeMetadata.name, attributeValue));
    }
  });

  if (children.length > 0) {
    return (
      <Panel key={mode.concat(name)} title={name}>
        {...children}
      </Panel>
    );
  }
}

type InspectorMode = 'layout' | 'attribute';
type Props = {
  node: UINode;
  metadata: Map<MetadataId, Metadata>;
  mode: InspectorMode;
  rawDisplayEnabled?: boolean;
};
export const AttributesInspector: React.FC<Props> = ({
  node,
  metadata,
  mode,
  rawDisplayEnabled = false,
}) => {
  return (
    <>
      {Object.keys(node.attributes).map(function (key, _) {
        const metadataId: number = Number(key);
        /**
         * The node top-level attributes refer to the displayable panels.
         * The panel name is obtained by querying the metadata.
         * The inspectable contains the actual attributes belonging to each panel.
         */
        return createSection(
          mode,
          metadata,
          metadata.get(metadataId)?.name ?? '',
          node.attributes[metadataId] as InspectableObject,
        );
      })}
      {rawDisplayEnabled ?? (
        <Panel key="Raw" title="Raw Data" collapsed>
          <DataInspector data={node.attributes} />
        </Panel>
      )}
    </>
  );
};

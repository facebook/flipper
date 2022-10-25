/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Inspectable, InspectableObject, UINode} from '../../../types';
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
  name: string;
  value: Record<string, Inspectable>;
  level: number;
}> = ({name, value, level}) => {
  return (
    <div style={ContainerStyle}>
      {name}
      {Object.keys(value).map(function (key, _) {
        return (
          <ObjectContainer
            key={key}
            style={{
              paddingLeft: level,
            }}>
            {create(key, value[key], level + 2)}
          </ObjectContainer>
        );
      })}
    </div>
  );
};

function create(key: string, inspectable: Inspectable, level: number = 2) {
  switch (inspectable.type) {
    case 'boolean':
      return (
        <NamedAttributeInspector name={displayableName(key)}>
          <Checkbox checked={inspectable.value} disabled />
        </NamedAttributeInspector>
      );
    case 'enum':
      return (
        <NamedAttributeInspector name={displayableName(key)}>
          <EnumValue>{inspectable.value.value}</EnumValue>
        </NamedAttributeInspector>
      );
    case 'text':
      return (
        <NamedAttributeInspector name={displayableName(key)}>
          <TextValue>{inspectable.value}</TextValue>
        </NamedAttributeInspector>
      );
    case 'number':
      return (
        <NamedAttributeInspector name={displayableName(key)}>
          <NumberValue>{inspectable.value}</NumberValue>
        </NamedAttributeInspector>
      );
    case 'color':
      return (
        <NamedAttributeInspector name={displayableName(key)}>
          <ColorInspector color={inspectable.value} />
        </NamedAttributeInspector>
      );
    case 'size':
      return (
        <NamedAttributeInspector name={displayableName(key)}>
          <SizeInspector value={inspectable.value} />
        </NamedAttributeInspector>
      );
    case 'bounds':
      return (
        <NamedAttributeInspector name={displayableName(key)}>
          <BoundsInspector value={inspectable.value} />
        </NamedAttributeInspector>
      );
    case 'coordinate':
      return (
        <NamedAttributeInspector name={displayableName(key)}>
          <CoordinateInspector value={inspectable.value} />
        </NamedAttributeInspector>
      );
    case 'coordinate3d':
      return (
        <NamedAttributeInspector name={displayableName(key)}>
          <Coordinate3DInspector value={inspectable.value} />
        </NamedAttributeInspector>
      );
    case 'space':
      return (
        <NamedAttributeInspector name={displayableName(key)}>
          <SpaceBoxInspector value={inspectable.value} />
        </NamedAttributeInspector>
      );
    case 'object':
      return (
        <ObjectAttributeInspector
          name={displayableName(key)}
          value={inspectable.fields}
          level={level}
        />
      );
    default:
      return (
        <NamedAttributeInspector name={displayableName(key)}>
          <TextValue>{JSON.stringify(inspectable)}</TextValue>
        </NamedAttributeInspector>
      );
  }
}

/**
 * Filter out those inspectables that affect sizing, positioning, and
 * overall layout of elements.
 */
const layoutFilter = new Set([
  'size',
  'padding',
  'margin',
  'bounds',
  'position',
  'globalPosition',
  'localVisibleRect',
  'rotation',
  'scale',
  'pivot',
  'layoutParams',
  'layoutDirection',
  'translation',
  'elevation',
]);
function createSection(
  mode: InspectorMode,
  name: string,
  inspectable: InspectableObject,
) {
  const fields = Object.keys(inspectable.fields).filter(
    (key) =>
      (mode === 'attributes' && !layoutFilter.has(key)) ||
      (mode === 'layout' && layoutFilter.has(key)),
  );
  if (!fields || fields.length === 0) {
    return;
  }
  return (
    <Panel key={name} title={name}>
      {fields.map(function (key, _) {
        return create(key, inspectable.fields[key]);
      })}
    </Panel>
  );
}

type InspectorMode = 'layout' | 'attributes';
type Props = {
  node: UINode;
  mode: InspectorMode;
  rawDisplayEnabled?: boolean;
};
export const AttributesInspector: React.FC<Props> = ({
  node,
  mode,
  rawDisplayEnabled = false,
}) => {
  return (
    <>
      {Object.keys(node.attributes).map(function (key, _) {
        return createSection(
          mode,
          key,
          node.attributes[key] as InspectableObject,
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

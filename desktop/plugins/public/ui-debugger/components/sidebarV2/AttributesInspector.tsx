/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Input, Typography} from 'antd';
import {Panel, theme, Layout} from 'flipper-plugin';
import React from 'react';
import {
  ClientNode,
  Inspectable,
  InspectableObject,
  Metadata,
} from '../../ClientTypes';
import {MetadataMap} from '../../DesktopTypes';
import {NoData} from '../sidebar/inspector/NoData';
import {css, cx} from '@emotion/css';
import {upperFirst} from 'lodash';

export function AttributesInspector({
  node,
  metadata,
}: {
  node: ClientNode;
  metadata: MetadataMap;
}) {
  const keys = Object.keys(node.attributes);
  const sections = keys
    .map((key, _) => {
      /**
       * The node top-level attributes refer to the displayable panels.
       * The panel name is obtained by querying the metadata.
       * The inspectable contains the actual attributes belonging to each panel.
       */
      const metadataId: number = Number(key);
      const sectionMetadata = metadata.get(metadataId);
      if (sectionMetadata == null) {
        return null;
      }
      const sectionAttributes = node.attributes[
        metadataId
      ] as InspectableObject;

      return AttributeSection(
        metadata,
        sectionMetadata.name,
        sectionAttributes,
      );
    })
    .filter((section) => section != null);

  if (sections.length === 0) {
    return <NoData message="No data available for this element" />;
  }
  return <>{sections}</>;
}

function AttributeSection(
  metadataMap: MetadataMap,
  name: string,
  inspectable: InspectableObject,
) {
  const children = Object.keys(inspectable.fields)
    .map((key) => {
      const metadataId: number = Number(key);
      const attributeMetadata = metadataMap.get(metadataId);

      if (attributeMetadata == null) {
        return null;
      }
      const attributeValue = inspectable.fields[metadataId];

      const attributeName =
        upperFirst(attributeMetadata?.name) ?? String(metadataId);
      return (
        <Layout.Horizontal key={key} gap="small">
          <Typography.Text
            style={{
              marginTop: 3, //to center with top input when multiline
              flex: '0 0 30%', //take 30% of the width
              color: theme.textColorSecondary,
              fontWeight: 50,
            }}>
            {attributeName}
          </Typography.Text>

          <Layout.Container style={{flex: '1 1 auto'}}>
            <AttributeValue
              name={attributeName}
              attributeMetadata={attributeMetadata}
              metadataMap={metadataMap}
              inspectable={attributeValue}
              level={1}
            />
          </Layout.Container>
        </Layout.Horizontal>
      );
    })
    .filter((attr) => attr != null);

  if (children.length > 0) {
    return (
      <Panel key={name} title={name}>
        <Layout.Container gap="small" padv="small">
          {...children}
        </Layout.Container>
      </Panel>
    );
  } else {
    return null;
  }
}

/**
 * disables hover and focsued states
 */
const readOnlyInput = css`
  :hover {
    border-color: ${theme.disabledColor} !important;
  }
  :focus {
    border-color: ${theme.disabledColor} !important;

    box-shadow: none !important;
  }
  box-shadow: none !important;
  border-color: ${theme.disabledColor} !important;

  padding: 2px 4px 2px 4px;

  min-height: 20px !important; //this is for text area
`;

function StyledInput({
  value,
  color,
  mutable,
  rightAddon,
}: {
  value: any;
  color: string;
  mutable: boolean;
  rightAddon?: string;
}) {
  return (
    <Input
      size="small"
      className={cx(
        !mutable ? readOnlyInput : '',
        css`
          //set input colour when no suffix
          color: ${color};
          //set input colour when has suffix
          .ant-input.ant-input-sm[type='text'] {
            color: ${color};
          }
          //set colour of suffix
          .ant-input.ant-input-sm[type='text'] + .ant-input-suffix {
            color: ${theme.textColorSecondary};
            opacity: 0.7;
          }
        `,
      )}
      bordered
      readOnly={!mutable}
      value={value}
      suffix={rightAddon}
    />
  );
}

function StyledTextArea({
  value,
  color,
  mutable,
}: {
  value: any;
  color: string;
  mutable: boolean;
  rightAddon?: string;
}) {
  return (
    <Input.TextArea
      autoSize
      className={!mutable ? readOnlyInput : ''}
      bordered
      style={{color: color}}
      readOnly={!mutable}
      value={value}
    />
  );
}

const boolColor = '#C41D7F';
const stringColor = '#AF5800';
const enumColor = '#006D75';
const numberColor = '#003EB3';

type NumberGroupValue = {value: number; addonText: string};

function NumberGroup({values}: {values: NumberGroupValue[]}) {
  return (
    <Layout.Horizontal gap="small">
      {values.map(({value, addonText}, idx) => (
        <StyledInput
          key={idx}
          color={numberColor}
          mutable={false}
          value={value}
          rightAddon={addonText}
        />
      ))}
    </Layout.Horizontal>
  );
}

function AttributeValue({
  inspectable,
}: {
  attributeMetadata: Metadata;
  metadataMap: MetadataMap;
  name: string;
  inspectable: Inspectable;
  level: number;
}) {
  switch (inspectable.type) {
    case 'boolean':
      return (
        <StyledInput
          color={boolColor}
          mutable={false}
          value={inspectable.value ? 'TRUE' : 'FALSE'}
        />
      );
    case 'text':
      return (
        <StyledTextArea
          color={stringColor}
          mutable={false}
          value={inspectable.value}
        />
      );
    case 'number':
      return (
        <StyledInput
          color={numberColor}
          mutable={false}
          value={inspectable.value}
        />
      );

    case 'enum':
      return (
        <StyledInput
          color={enumColor}
          mutable={false}
          value={inspectable.value}
        />
      );
    case 'size':
      return (
        <NumberGroup
          values={[
            {value: inspectable.value.width, addonText: 'W'},
            {value: inspectable.value.height, addonText: 'H'},
          ]}
        />
      );

    case 'coordinate':
      return (
        <NumberGroup
          values={[
            {value: inspectable.value.x, addonText: 'X'},
            {value: inspectable.value.y, addonText: 'Y'},
          ]}
        />
      );
    case 'coordinate3d':
      return (
        <NumberGroup
          values={[
            {value: inspectable.value.x, addonText: 'X'},
            {value: inspectable.value.y, addonText: 'Y'},
            {value: inspectable.value.z, addonText: 'Z'},
          ]}
        />
      );
    case 'space':
      return (
        <Layout.Container gap="small" style={{flex: '0 1 auto'}}>
          <NumberGroup
            values={[
              {value: inspectable.value.top, addonText: 'T'},
              {value: inspectable.value.left, addonText: 'L'},
            ]}
          />
          <NumberGroup
            values={[
              {value: inspectable.value.bottom, addonText: 'B'},
              {value: inspectable.value.right, addonText: 'R'},
            ]}
          />
        </Layout.Container>
      );
    case 'bounds':
      return (
        <Layout.Container gap="small" style={{flex: '0 1 auto'}}>
          <NumberGroup
            values={[
              {value: inspectable.value.x, addonText: 'X'},
              {value: inspectable.value.y, addonText: 'Y'},
            ]}
          />
          <NumberGroup
            values={[
              {value: inspectable.value.width, addonText: 'W'},
              {value: inspectable.value.height, addonText: 'H'},
            ]}
          />
        </Layout.Container>
      );
  }
  return null;
}

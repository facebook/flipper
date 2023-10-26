/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button, Divider, Input, Modal, Typography} from 'antd';

import {
  DataInspector,
  Panel,
  theme,
  Layout,
  styled,
  useLocalStorageState,
} from 'flipper-plugin';
import React, {useState} from 'react';
import {
  ClientNode,
  Color,
  Inspectable,
  InspectableObject,
  Metadata,
} from '../../ClientTypes';
import {MetadataMap} from '../../DesktopTypes';
import {NoData} from '../sidebar/inspector/NoData';
import {css, cx} from '@emotion/css';
import {upperFirst, sortBy, omit} from 'lodash';
import {any} from 'lodash/fp';
import {InspectableColor} from '../../ClientTypes';
import {transformAny} from '../../utils/dataTransform';
import {SearchOutlined} from '@ant-design/icons';

type ModalData = {
  data: unknown;
  title: string;
};

const panelCss = css`
  & > .ant-collapse-item .ant-collapse-header {
    background-color: ${theme.backgroundDefault};
    padding-left: 0px;
  }

  & > .ant-collapse-item .ant-collapse-header .ant-collapse-expand-icon {
    width: 18px;
  }
`;

export function AttributesInspector({
  node,
  metadata,
}: {
  node: ClientNode;
  metadata: MetadataMap;
}) {
  const [modalData, setModalData] = useState<ModalData | null>(null);

  const [attributeFilter, setAttributeFilter] = useLocalStorageState(
    'attribute-filter',
    '',
  );

  const showComplexTypeModal = (modaldata: ModalData) => {
    setModalData(modaldata);
  };

  const handleCancel = () => {
    setModalData(null);
  };

  const keys = Object.keys(node.attributes);
  const sections = keys
    .map((key, _) => {
      /**
       * The node top-level attributes refer to the displayable panels aka sections.
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
        showComplexTypeModal,
        attributeFilter,
      );
    })
    .filter((section) => section != null);

  if (sections.length === 0 && !attributeFilter) {
    return <NoData message="No data available for this element" />;
  }

  return (
    <>
      {modalData != null && (
        <Modal
          title={modalData.title}
          open
          onOk={handleCancel}
          onCancel={handleCancel}
          footer={null}>
          <DataInspector data={modalData.data} />
        </Modal>
      )}
      <Layout.Container gap="small" padv="medium">
        <Input
          value={attributeFilter}
          onChange={(e) => setAttributeFilter(e.target.value)}
          placeholder="Filter attributes"
          prefix={<SearchOutlined />}
        />

        {sections.length === 0 ? (
          <NoData message="No attributes match filter " />
        ) : (
          sections.concat([
            <Panel key="Raw" title="Raw Data" className={panelCss} collapsed>
              <DataInspector data={omit(node, ['attributes'])} />
            </Panel>,
          ])
        )}
      </Layout.Container>
    </>
  );
}

function AttributeSection(
  metadataMap: MetadataMap,
  name: string,
  inspectable: InspectableObject,
  onDisplayModal: (modaldata: ModalData) => void,
  attributeFilter: string,
) {
  const attributesOrSubSubsections = Object.entries(inspectable.fields)
    .map(([fieldKey, attributeValue]) => {
      const metadataId: number = Number(fieldKey);
      const attributeMetadata = metadataMap.get(metadataId);
      const attributeName =
        upperFirst(attributeMetadata?.name) ?? String(metadataId);
      //subsections are complex types that are only 1 level deep
      const isSubSection =
        attributeValue.type === 'object' &&
        !any(
          (inspectable) =>
            inspectable.type === 'array' || inspectable.type === 'object',
          Object.values(attributeValue.fields),
        );
      return {
        attributeName,
        attributeMetadata,
        isSubSection,
        attributeValue,
        metadataId,
      };
    })
    .filter(
      ({attributeName}) =>
        !attributeFilter ||
        attributeName.toLowerCase().includes(attributeFilter),
    );

  //push sub sections to the end
  const sortedAttributesOrSubsections = sortBy(
    attributesOrSubSubsections,
    [(item) => item.isSubSection],
    (item) => item.attributeName,
  );

  const children = sortedAttributesOrSubsections
    .map(({isSubSection, attributeValue, attributeMetadata, attributeName}) => {
      if (attributeMetadata == null) {
        return null;
      }

      if (isSubSection) {
        if (attributeValue.type === 'object') {
          return (
            <SubSection
              onDisplayModal={onDisplayModal}
              attributeName={attributeName}
              inspectableObject={attributeValue}
              metadataMap={metadataMap}
            />
          );
        }
      }

      return (
        <NamedAttribute
          attributeMetadata={attributeMetadata}
          onDisplayModal={onDisplayModal}
          key={attributeName}
          metadataMap={metadataMap}
          name={attributeName}
          value={attributeValue}
        />
      );
    })
    .filter((attr) => attr != null);

  if (children.length > 0) {
    return (
      <Panel className={panelCss} key={name} title={name}>
        <Layout.Container gap="small" padv="small" style={{paddingLeft: 18}}>
          {...children}
        </Layout.Container>
      </Panel>
    );
  } else {
    return null;
  }
}

function SubSection({
  attributeName,
  inspectableObject,
  metadataMap,
  onDisplayModal,
}: {
  attributeName: string;
  inspectableObject: InspectableObject;
  metadataMap: MetadataMap;
  onDisplayModal: (modaldata: ModalData) => void;
}) {
  const children = Object.entries(inspectableObject.fields).map(
    ([key, value]) => {
      const metadataId: number = Number(key);
      const attributeMetadata = metadataMap.get(metadataId);
      if (attributeMetadata == null) {
        return null;
      }
      const attributeName =
        upperFirst(attributeMetadata?.name) ?? String(metadataId);

      return (
        <NamedAttribute
          key={key}
          onDisplayModal={onDisplayModal}
          name={attributeName}
          value={value}
          attributeMetadata={attributeMetadata}
          metadataMap={metadataMap}
        />
      );
    },
  );
  if (children.length === 0) {
    return null;
  }
  return (
    <Layout.Container gap="small" padv="small">
      <Divider style={{margin: 0}} />
      <Typography.Text>{attributeName}</Typography.Text>
      {children}
    </Layout.Container>
  );
}

function NamedAttribute({
  key,
  name,
  value,
  metadataMap,
  attributeMetadata,
  onDisplayModal,
}: {
  name: string;
  value: Inspectable;
  attributeMetadata: Metadata;
  metadataMap: MetadataMap;
  key: string;
  onDisplayModal: (modaldata: ModalData) => void;
}) {
  return (
    <Layout.Horizontal key={key} gap="small">
      <Typography.Text
        style={{
          marginTop: 4, //to center with top input when multiline
          flex: '0 0 40%', //take 40% of the width
          color: theme.textColorSecondary,
          opacity: 0.7,
          fontWeight: 50,
          fontSize: 'small',
        }}>
        {name}
      </Typography.Text>

      <Layout.Container style={{flex: '1 1 auto'}}>
        <AttributeValue
          onDisplayModal={onDisplayModal}
          name={name}
          attributeMetadata={attributeMetadata}
          metadataMap={metadataMap}
          inspectable={value}
        />
      </Layout.Container>
    </Layout.Horizontal>
  );
}

/**
 * disables hover and focsued states
 */
const readOnlyInput = css`
  font-size: small;
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
  let formatted: any = value;
  if (typeof value === 'number') {
    //cap the number of decimal places to 5 but dont add trailing zeros
    formatted = Number.parseFloat(value.toFixed(5));
  }
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
      value={formatted}
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
  metadataMap,
  name,
  onDisplayModal,
  inspectable,
}: {
  onDisplayModal: (modaldata: ModalData) => void;
  attributeMetadata: Metadata;
  metadataMap: MetadataMap;
  name: string;
  inspectable: Inspectable;
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
    case 'unknown':
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
        <TwoByTwoNumberGroup
          values={[
            {value: inspectable.value.top, addonText: 'T'},
            {value: inspectable.value.left, addonText: 'L'},
            {value: inspectable.value.bottom, addonText: 'B'},
            {value: inspectable.value.right, addonText: 'R'},
          ]}
        />
      );
    case 'bounds':
      return (
        <TwoByTwoNumberGroup
          values={[
            {value: inspectable.value.x, addonText: 'X'},
            {value: inspectable.value.y, addonText: 'Y'},
            {value: inspectable.value.width, addonText: 'W'},
            {value: inspectable.value.height, addonText: 'H'},
          ]}
        />
      );

    case 'color':
      return <ColorInspector inspectable={inspectable as InspectableColor} />;
    case 'array':
    case 'object':
      return (
        <Button
          size="small"
          onClick={() => {
            onDisplayModal({
              title: name,
              data: transformAny(metadataMap, inspectable),
            });
          }}
          style={{
            height: 26,
            boxSizing: 'border-box',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          type="ghost">
          <span
            style={{
              marginTop: 2,
              fontFamily: 'monospace',
              color: theme.textColorSecondary,
              fontSize: 'small',
            }}>
            {inspectable.type === 'array' ? '[...]' : '{...}'}
          </span>
        </Button>
      );
  }
  return null;
}

const rowHeight = 26;

function ColorInspector({inspectable}: {inspectable: InspectableColor}) {
  return (
    <Layout.Container gap="small">
      <NumberGroup
        values={[
          {value: inspectable.value.r, addonText: 'R'},
          {value: inspectable.value.g, addonText: 'G'},
          {value: inspectable.value.b, addonText: 'B'},
          {value: inspectable.value.a, addonText: 'A'},
        ]}
      />
      <Layout.Horizontal gap="medium">
        <ColorPreview
          background={`rgba(${inspectable.value.r},${inspectable.value.g},${inspectable.value.b},${inspectable.value.a})`}
        />
        <StyledTextArea
          color={stringColor}
          mutable={false}
          value={RGBAtoHEX(inspectable.value)}
        />
      </Layout.Horizontal>
    </Layout.Container>
  );
}

const ColorPreview = styled.div(({background}: {background: string}) => ({
  width: rowHeight,
  height: rowHeight,
  borderRadius: '8px',
  borderColor: theme.disabledColor,
  borderStyle: 'solid',
  boxSizing: 'border-box',
  borderWidth: '1px',
  backgroundColor: background,
}));

const RGBAtoHEX = (color: Color) => {
  const hex =
    (color.r | (1 << 8)).toString(16).slice(1) +
    (color.g | (1 << 8)).toString(16).slice(1) +
    (color.b | (1 << 8)).toString(16).slice(1);

  return '#' + hex.toUpperCase();
};

type FourItemArray<T = any> = [T, T, T, T];

function TwoByTwoNumberGroup({
  values,
}: {
  values: FourItemArray<NumberGroupValue>;
}) {
  return (
    <Layout.Container gap="small" style={{flex: '0 1 auto'}}>
      <NumberGroup values={[values[0], values[1]]} />
      <NumberGroup values={[values[2], values[3]]} />
    </Layout.Container>
  );
}

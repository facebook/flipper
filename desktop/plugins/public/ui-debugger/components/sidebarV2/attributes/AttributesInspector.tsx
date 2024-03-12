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
  useLocalStorageState,
  usePlugin,
} from 'flipper-plugin';
import React, {useState} from 'react';
import {
  ClientNode,
  CompoundTypeHint,
  Id,
  Inspectable,
  InspectableObject,
  Metadata,
  MetadataId,
} from '../../../ClientTypes';
import {MetadataMap} from '../../../DesktopTypes';
import {NoData} from '../NoData';
import {css} from '@emotion/css';
import {upperFirst, sortBy, omit} from 'lodash';
import {any} from 'lodash/fp';
import {InspectableColor} from '../../../ClientTypes';
import {transformAny} from '../../../utils/dataTransform';
import {SearchOutlined} from '@ant-design/icons';
import {plugin} from '../../../index';
// eslint-disable-next-line @typescript-eslint/no-unused-vars, rulesdir/no-restricted-imports-clone
import {Glyph} from 'flipper';
import {
  NumberGroup,
  StyledInputNumber,
  TwoByTwoNumberGroup,
} from './NumericInputs';
import {
  boolColor,
  enumColor,
  numberColor,
  rowHeight,
  stringColor,
} from './shared';
import {StyledTextArea} from './TextInput';
import {ColorInspector} from './ColorInput';
import {SelectInput} from './SelectInput';

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
        node.id,
        metadata,
        sectionMetadata,
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
            <Panel
              key="Raw"
              title="Internal Debug Data"
              className={panelCss}
              collapsed>
              <DataInspector data={omit(node, ['attributes'])} />
            </Panel>,
          ])
        )}
      </Layout.Container>
    </>
  );
}

function AttributeSection(
  nodeId: Id,
  metadataMap: MetadataMap,
  sectionMetadata: Metadata,
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

  const metadataPath = [sectionMetadata.id];

  const children = sortedAttributesOrSubsections
    .map(({isSubSection, attributeValue, attributeMetadata, attributeName}) => {
      if (attributeMetadata == null) {
        return null;
      }

      if (isSubSection) {
        if (attributeValue.type === 'object') {
          return (
            <SubSection
              key={`subsection_${attributeName}`}
              nodeId={nodeId}
              onDisplayModal={onDisplayModal}
              attributeName={attributeName}
              metadataPath={[...metadataPath, attributeMetadata.id]}
              inspectableObject={attributeValue}
              metadataMap={metadataMap}
            />
          );
        }
      }

      return (
        <NamedAttribute
          nodeId={nodeId}
          attributeMetadata={attributeMetadata}
          onDisplayModal={onDisplayModal}
          key={attributeName}
          metadataMap={metadataMap}
          metadataPath={[...metadataPath, attributeMetadata.id]}
          name={attributeName}
          value={attributeValue}
        />
      );
    })
    .filter((attr) => attr != null);

  if (children.length > 0) {
    return (
      <Panel
        className={panelCss}
        key={sectionMetadata.name}
        title={sectionMetadata.name}>
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
  nodeId,
  attributeName,
  inspectableObject,
  metadataMap,
  metadataPath,
  onDisplayModal,
}: {
  nodeId: Id;
  attributeName: string;
  inspectableObject: InspectableObject;
  metadataPath: MetadataId[];
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
          nodeId={nodeId}
          key={key}
          onDisplayModal={onDisplayModal}
          name={attributeName}
          metadataPath={[...metadataPath, attributeMetadata.id]}
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
  nodeId,
  name,
  value,
  metadataPath,
  metadataMap,
  attributeMetadata,
  onDisplayModal,
}: {
  nodeId: Id;
  name: string;
  value: Inspectable;
  metadataPath: MetadataId[];
  attributeMetadata: Metadata;
  metadataMap: MetadataMap;

  onDisplayModal: (modaldata: ModalData) => void;
}) {
  return (
    <Layout.Horizontal key={name} gap="small">
      <Typography.Text
        style={{
          marginTop: 4, //to center with top input when multiline
          flex: '0 0 30%', //take 40% of the width
          color: theme.textColorSecondary,
          opacity: 0.7,
          fontSize: 'small',
        }}>
        {name}
      </Typography.Text>

      <Layout.Container style={{flex: '1 1 auto'}}>
        <AttributeValue
          onDisplayModal={onDisplayModal}
          name={name}
          metadataPath={metadataPath}
          attributeMetadata={attributeMetadata}
          metadataMap={metadataMap}
          inspectable={value}
          nodeId={nodeId}
        />
      </Layout.Container>
    </Layout.Horizontal>
  );
}

function AttributeValue({
  metadataMap,
  name,
  onDisplayModal,
  nodeId,
  metadataPath,
  inspectable,
  attributeMetadata,
}: {
  nodeId: Id;
  onDisplayModal: (modaldata: ModalData) => void;
  metadataPath: MetadataId[];
  attributeMetadata: Metadata;
  metadataMap: MetadataMap;
  name: string;
  inspectable: Inspectable;
}) {
  const instance = usePlugin(plugin);

  const numberGroupOnChange = (value: number, hint: CompoundTypeHint): void => {
    instance.uiActions.editClientAttribute(nodeId, value, metadataPath, hint);
  };
  switch (inspectable.type) {
    case 'boolean':
      return (
        <SelectInput
          options={[
            {value: true, label: 'TRUE'},
            {value: false, label: 'FALSE'},
          ]}
          onChange={(value) => {
            instance.uiActions.editClientAttribute(nodeId, value, metadataPath);
          }}
          mutable={attributeMetadata.mutable}
          value={inspectable.value}
          color={boolColor}
        />
      );
    case 'unknown':
    case 'text':
      return (
        <StyledTextArea
          color={stringColor}
          mutable={attributeMetadata.mutable}
          value={inspectable.value}
          onChange={(value) => {
            instance.uiActions.editClientAttribute(nodeId, value, metadataPath);
          }}
        />
      );
    case 'number':
      return (
        <StyledInputNumber
          color={numberColor}
          mutable={attributeMetadata.mutable}
          minValue={attributeMetadata.minValue}
          maxValue={attributeMetadata.maxValue}
          value={inspectable.value}
          onChange={(value) => {
            instance.uiActions.editClientAttribute(nodeId, value, metadataPath);
          }}
        />
      );

    case 'enum':
      return (
        <SelectInput
          options={
            attributeMetadata.possibleValues?.map((value) => {
              if ('value' in value) {
                return {
                  label: String(value.value),
                  value: value.value as any,
                };
              } else {
                return {
                  label: 'UNKNOWN',
                  value: 'UNKNOWN',
                };
              }
            }) ?? []
          }
          onChange={(value) => {
            instance.uiActions.editClientAttribute(nodeId, value, metadataPath);
          }}
          mutable={attributeMetadata.mutable}
          value={inspectable.value}
          color={enumColor}
        />
      );
    case 'size':
      return (
        <NumberGroup
          values={[
            {
              min: 0,
              value: inspectable.value.width,
              addonText: 'W',
              mutable: attributeMetadata.mutable,
              hint: 'WIDTH',
              onChange: numberGroupOnChange,
            },
            {
              min: 0,
              value: inspectable.value.height,
              addonText: 'H',
              mutable: attributeMetadata.mutable,
              hint: 'HEIGHT',
              onChange: numberGroupOnChange,
            },
          ]}
        />
      );

    case 'coordinate':
      return (
        <NumberGroup
          values={[
            {
              value: inspectable.value.x,
              addonText: 'X',
              mutable: attributeMetadata.mutable,
              hint: 'X',
              onChange: numberGroupOnChange,
            },
            {
              value: inspectable.value.y,
              addonText: 'Y',
              mutable: attributeMetadata.mutable,
              hint: 'Y',
              onChange: numberGroupOnChange,
            },
          ]}
        />
      );
    case 'coordinate3d':
      return (
        <NumberGroup
          values={[
            {
              value: inspectable.value.x,
              addonText: 'X',
              mutable: attributeMetadata.mutable,
              hint: 'X',
              onChange: numberGroupOnChange,
            },
            {
              value: inspectable.value.y,
              addonText: 'Y',
              mutable: attributeMetadata.mutable,
              hint: 'Y',
              onChange: numberGroupOnChange,
            },
            {
              value: inspectable.value.z,
              addonText: 'Z',
              mutable: attributeMetadata.mutable,
              hint: 'Z',
              onChange: numberGroupOnChange,
            },
          ]}
        />
      );
    case 'space':
      return (
        <TwoByTwoNumberGroup
          values={[
            {
              value: inspectable.value.top,
              addonText: 'T',
              mutable: attributeMetadata.mutable,
              hint: 'TOP',
              onChange: numberGroupOnChange,
            },
            {
              value: inspectable.value.left,
              addonText: 'L',
              mutable: attributeMetadata.mutable,
              hint: 'LEFT',
              onChange: numberGroupOnChange,
            },
            {
              value: inspectable.value.bottom,
              addonText: 'B',
              mutable: attributeMetadata.mutable,
              hint: 'BOTTOM',
              onChange: numberGroupOnChange,
            },
            {
              value: inspectable.value.right,
              addonText: 'R',
              mutable: attributeMetadata.mutable,
              hint: 'RIGHT',
              onChange: numberGroupOnChange,
            },
          ]}
        />
      );
    case 'bounds':
      return (
        <TwoByTwoNumberGroup
          values={[
            {
              value: inspectable.value.x,
              addonText: 'X',
              mutable: attributeMetadata.mutable,
              hint: 'X',
              onChange: numberGroupOnChange,
            },
            {
              value: inspectable.value.y,
              addonText: 'Y',
              mutable: attributeMetadata.mutable,
              hint: 'Y',
              onChange: numberGroupOnChange,
            },
            {
              min: 0,
              value: inspectable.value.width,
              addonText: 'W',
              mutable: attributeMetadata.mutable,
              hint: 'WIDTH',
              onChange: numberGroupOnChange,
            },
            {
              min: 0,
              value: inspectable.value.height,
              addonText: 'H',
              mutable: attributeMetadata.mutable,
              hint: 'HEIGHT',
              onChange: numberGroupOnChange,
            },
          ]}
        />
      );

    case 'color':
      return (
        <ColorInspector
          onChange={(color) =>
            instance.uiActions.editClientAttribute(
              nodeId,
              color,
              metadataPath,
              'COLOR',
            )
          }
          mutable={attributeMetadata.mutable}
          inspectable={inspectable as InspectableColor}
        />
      );
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
            height: rowHeight,
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
    case 'pluginDeeplink':
      return (
        <Button
          size="small"
          onClick={() => {
            instance.client.selectPlugin(
              inspectable.pluginId,
              inspectable.deeplinkPayload,
            );
          }}
          style={{
            height: rowHeight,
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
            {inspectable.label}
          </span>
          <Glyph
            style={{marginLeft: 8, marginBottom: 2}}
            size={12}
            name="share-external"
          />
        </Button>
      );
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CloseOutlined} from '@ant-design/icons';
import {Button, Space} from 'antd';
import * as React from 'react';
import {FieldConfig, OperatorConfig} from './PowerSearchConfig';
import {PowerSearchEnumTerm} from './PowerSearchEnumTerm';
import {PowerSearchFloatTerm} from './PowerSearchFloatTerm';
import {PowerSearchIntegerTerm} from './PowerSearchIntegerTerm';
import {PowerSearchStringTerm} from './PowerSearchStringTerm';

export type IncompleteSearchExpressionTerm = {
  field: FieldConfig;
  operator: OperatorConfig;
  searchValue?: any;
};
export type SearchExpressionTerm = Required<IncompleteSearchExpressionTerm>;

type PowerSearchTermProps = {
  searchTerm: IncompleteSearchExpressionTerm;
  searchValueRenderer: 'input' | 'button';
  onCancel: () => void;
  onFinalize: (completeSearchTerm: SearchExpressionTerm) => void;
};

export const PowerSearchTerm: React.FC<PowerSearchTermProps> = ({
  searchTerm,
  searchValueRenderer,
  onCancel,
  onFinalize,
}) => {
  let searchValueComponent: React.ReactNode = null;
  if (searchValueRenderer === 'input') {
    switch (searchTerm.operator.valueType) {
      case 'STRING': {
        searchValueComponent = (
          <PowerSearchStringTerm
            onCancel={onCancel}
            onChange={(newValue) => {
              onFinalize({
                ...searchTerm,
                searchValue: newValue,
              });
            }}
          />
        );
        break;
      }
      case 'INTEGER': {
        searchValueComponent = (
          <PowerSearchIntegerTerm
            onCancel={onCancel}
            onChange={(newValue) => {
              onFinalize({
                ...searchTerm,
                searchValue: newValue,
              });
            }}
          />
        );
        break;
      }
      case 'FLOAT': {
        searchValueComponent = (
          <PowerSearchFloatTerm
            onCancel={onCancel}
            onChange={(newValue) => {
              onFinalize({
                ...searchTerm,
                searchValue: newValue,
              });
            }}
          />
        );
        break;
      }
      case 'NO_VALUE': {
        // Nothing needs to be done. It should never be the case.
        searchValueComponent = null;
        break;
      }
      case 'ENUM': {
        searchValueComponent = (
          <PowerSearchEnumTerm
            onCancel={onCancel}
            onChange={(newValue) => {
              onFinalize({
                ...searchTerm,
                searchValue: newValue,
              });
            }}
            enumLabels={searchTerm.operator.enumLabels}
          />
        );
        break;
      }
      default: {
        console.error(
          'PowerSearchTerm -> unknownoperator.valueType',
          searchTerm.operator.valueType,
          searchTerm,
        );
      }
    }
  } else {
    switch (searchTerm.operator.valueType) {
      case 'ENUM': {
        searchValueComponent = (
          <Button>
            {searchTerm.operator.enumLabels[searchTerm.searchValue]}
          </Button>
        );
        break;
      }
      case 'NO_VALUE': {
        searchValueComponent = null;
        break;
      }
      default: {
        searchValueComponent = <Button>{searchTerm.searchValue}</Button>;
      }
    }
  }

  return (
    <Space.Compact block size="small">
      <Button>{searchTerm.field.label}</Button>
      {searchTerm.operator.label ? (
        <Button>{searchTerm.operator.label}</Button>
      ) : null}
      {searchValueComponent}
      <Button
        icon={<CloseOutlined />}
        onClick={() => {
          onCancel();
        }}
      />
    </Space.Compact>
  );
};

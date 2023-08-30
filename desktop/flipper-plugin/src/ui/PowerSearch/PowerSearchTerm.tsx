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
  let searchValueInputComponent: React.ReactNode = null;
  switch (searchTerm.operator.valueType) {
    case 'STRING': {
      searchValueInputComponent = (
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
      searchValueInputComponent = (
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
      searchValueInputComponent = (
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
      // Nothing needs to be done. The effect below is going to fire and mark it as the final value.
      searchValueInputComponent = null;
      break;
    }
    case 'ENUM': {
      searchValueInputComponent = (
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

  React.useEffect(() => {
    if (searchTerm.operator.valueType === 'NO_VALUE') {
      onFinalize({
        ...searchTerm,
        searchValue: null,
      });
    }
  }, [searchTerm, onFinalize]);

  return (
    <Space.Compact block size="small">
      <Button>{searchTerm.field.label}</Button>
      <Button>{searchTerm.operator.label}</Button>
      {searchValueRenderer === 'button' ? (
        <Button>{searchTerm.searchValue ?? '...'}</Button>
      ) : (
        searchValueInputComponent
      )}
      <Button
        icon={<CloseOutlined />}
        onClick={() => {
          onCancel();
        }}
      />
    </Space.Compact>
  );
};

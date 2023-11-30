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
import {theme} from '../theme';
import {PowerSearchAbsoluteDateTerm} from './PowerSearchAbsoluteDateTerm';
import {OperatorConfig} from './PowerSearchConfig';
import {PowerSearchEnumSetTerm} from './PowerSearchEnumSetTerm';
import {PowerSearchFloatTerm} from './PowerSearchFloatTerm';
import {PowerSearchIntegerTerm} from './PowerSearchIntegerTerm';
import {PowerSearchStringSetTerm} from './PowerSearchStringSetTerm';
import {PowerSearchStringTerm} from './PowerSearchStringTerm';

export type IncompleteSearchExpressionTerm = {
  field: {key: string; label: string; useWholeRow?: boolean};
  operator: OperatorConfig;
  searchValue?: any;
};
export type SearchExpressionTerm = Required<IncompleteSearchExpressionTerm>;

type PowerSearchTermProps = {
  searchTerm: IncompleteSearchExpressionTerm;
  onCancel: () => void;
  onFinalize: (completeSearchTerm: SearchExpressionTerm) => void;
};

export const PowerSearchTerm: React.FC<PowerSearchTermProps> = ({
  searchTerm,
  onCancel,
  onFinalize,
}) => {
  let searchValueComponent: React.ReactNode = null;
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
          defaultValue={searchTerm.searchValue}
        />
      );
      break;
    }
    case 'STRING_SET': {
      searchValueComponent = (
        <PowerSearchStringSetTerm
          onCancel={onCancel}
          onChange={(newValue) => {
            onFinalize({
              ...searchTerm,
              searchValue: newValue,
            });
          }}
          defaultValue={searchTerm.searchValue}
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
          defaultValue={searchTerm.searchValue}
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
          defaultValue={searchTerm.searchValue}
        />
      );
      break;
    }
    case 'NO_VALUE': {
      // Nothing needs to be done. It should never be the case.
      searchValueComponent = null;
      break;
    }
    case 'ENUM_SET': {
      searchValueComponent = (
        <PowerSearchEnumSetTerm
          onCancel={onCancel}
          onChange={(newValue) => {
            onFinalize({
              ...searchTerm,
              searchValue: newValue,
            });
          }}
          enumLabels={searchTerm.operator.enumLabels}
          allowFreeform={searchTerm.operator.allowFreeform}
          defaultValue={searchTerm.searchValue}
        />
      );
      break;
    }
    case 'ABSOLUTE_DATE': {
      searchValueComponent = (
        <PowerSearchAbsoluteDateTerm
          onCancel={onCancel}
          onChange={(newValue) => {
            onFinalize({
              ...searchTerm,
              searchValue: newValue,
            });
          }}
          minValue={searchTerm.operator.minValue}
          maxValue={searchTerm.operator.maxValue}
          dateOnly={searchTerm.operator.dateOnly}
          defaultValue={searchTerm.searchValue}
        />
      );
      break;
    }
    default: {
      // Compilation is going to fail if switch-case is not exhaustive (i.e. we did not cover all possible cases)
      const exhaustiveCheck: never = searchTerm.operator;
      console.error(
        'PowerSearchTerm -> unknown operator.valueType',
        searchTerm,
        exhaustiveCheck,
      );
    }
  }

  return (
    <Space.Compact size="small" style={{margin: theme.space.tiny / 2}}>
      <Button tabIndex={-1} style={{pointerEvents: 'none'}}>
        {searchTerm.field.label}
      </Button>
      {searchTerm.operator.label ? (
        <Button tabIndex={-1} style={{pointerEvents: 'none'}}>
          {searchTerm.operator.label}
        </Button>
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

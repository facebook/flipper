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
import dayjs from 'dayjs';
import * as React from 'react';
import {
  DATE_ONLY_FORMAT,
  DATE_TIME_FORMAT,
  PowerSearchAbsoluteDateTerm,
} from './PowerSearchAbsoluteDateTerm';
import {FieldConfig, OperatorConfig} from './PowerSearchConfig';
import {PowerSearchEnumSetTerm} from './PowerSearchEnumSetTerm';
import {PowerSearchEnumTerm} from './PowerSearchEnumTerm';
import {PowerSearchFloatTerm} from './PowerSearchFloatTerm';
import {PowerSearchIntegerTerm} from './PowerSearchIntegerTerm';
import {PowerSearchStringSetTerm} from './PowerSearchStringSetTerm';
import {PowerSearchStringTerm} from './PowerSearchStringTerm';

export type IncompleteSearchExpressionTerm = {
  field: {key: string; label: string};
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
  const hasValue = searchTerm.searchValue != null;

  let searchValueComponent: React.ReactNode = null;
  if (!hasValue) {
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
            defaultValue={searchTerm.searchValue}
          />
        );
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
          />
        );
        break;
      }
      default: {
        console.error(
          'PowerSearchTerm -> unknown operator.valueType',
          searchTerm,
        );
      }
    }
  } else {
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
            defaultValue={searchTerm.searchValue}
          />
        );
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
      case 'ABSOLUTE_DATE': {
        searchValueComponent = (
          <Button>
            {searchTerm.operator.dateOnly
              ? dayjs(searchTerm.searchValue).format(DATE_ONLY_FORMAT)
              : dayjs(searchTerm.searchValue).format(DATE_TIME_FORMAT)}
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

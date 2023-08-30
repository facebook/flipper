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
import {PowerSearchStringTerm} from './PowerSearchStringTerm';

export type IncompleteSearchExpressionTerm = {
  field: FieldConfig;
  operator: OperatorConfig;
  searchValue?: string;
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
  return (
    <Space.Compact block size="small">
      <Button>{searchTerm.field.label}</Button>
      <Button>{searchTerm.operator.label}</Button>
      {searchValueRenderer === 'button' ? (
        <Button>{searchTerm.searchValue ?? '...'}</Button>
      ) : (
        <PowerSearchStringTerm
          onCancel={onCancel}
          onChange={(newValue) => {
            onFinalize({
              ...searchTerm,
              searchValue: newValue,
            });
          }}
        />
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

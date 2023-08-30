/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {AutoComplete, Input} from 'antd';
import {PowerSearchConfig} from './PowerSearchTypes';

export {PowerSearchConfig};

type PowerSearchProps = {
  config: PowerSearchConfig;
};

export const PowerSearch: React.FC<PowerSearchProps> = () => {
  return (
    <AutoComplete
      options={[
        {
          label: 'Group 1',
          options: [
            {
              value: 'g1_val1',
              label: 'Value1',
            },
            {
              value: 'g1_val2',
              label: 'Value2',
            },
          ],
        },
        {
          label: 'Group 2',
          options: [
            {
              value: 'g2_val1',
              label: 'Value1',
            },
            {
              value: 'g2_val2',
              label: 'Value2',
            },
          ],
        },
      ]}>
      <Input.Search size="large" />
    </AutoComplete>
  );
};

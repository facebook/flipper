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

type AutocompleteOption = {label: string; value: string};
type AutocompleteOptionGroup = {
  label: string;
  options: AutocompleteOption[];
};

const OPTION_KEY_DELIMITER = '::';

export const PowerSearch: React.FC<PowerSearchProps> = ({config}) => {
  const options: AutocompleteOptionGroup[] = React.useMemo(() => {
    const groupedOptions: AutocompleteOptionGroup[] = [];

    console.log('config.fields', config.fields);

    for (const field of Object.values(config.fields)) {
      const group: AutocompleteOptionGroup = {
        label: field.label,
        options: [],
      };

      for (const operator of Object.values(field.operators)) {
        const option: AutocompleteOption = {
          label: operator.label,
          value: `${field.key}${OPTION_KEY_DELIMITER}${operator.key}`,
        };
        group.options.push(option);
      }

      groupedOptions.push(group);
    }

    return groupedOptions;
  }, [config.fields]);
  return (
    <AutoComplete options={options}>
      <Input.Search size="large" />
    </AutoComplete>
  );
};

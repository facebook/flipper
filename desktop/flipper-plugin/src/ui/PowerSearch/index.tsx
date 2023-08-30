/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {AutoComplete, Space, Tag} from 'antd';
import {PowerSearchConfig} from './PowerSearchTypes';

export {PowerSearchConfig};

type PowerSearchProps = {
  config: PowerSearchConfig;
};

type AutocompleteOption = {label: string; value: string};
type AutocompleteOptionGroup = {
  label: string;
  options: AutocompleteOption[];
  value: string;
};

const OPTION_KEY_DELIMITER = '::';

export const PowerSearch: React.FC<PowerSearchProps> = ({config}) => {
  const [searchExpression, setSearchExpression] = React.useState<
    AutocompleteOption[]
  >([]);

  const options: AutocompleteOptionGroup[] = React.useMemo(() => {
    const groupedOptions: AutocompleteOptionGroup[] = [];

    for (const field of Object.values(config.fields)) {
      const group: AutocompleteOptionGroup = {
        label: field.label,
        options: [],
        value: field.key,
      };

      for (const operator of Object.values(field.operators)) {
        const option: AutocompleteOption = {
          label: `${field.label} ${operator.label}`,
          value: `${field.key}${OPTION_KEY_DELIMITER}${operator.key}`,
        };
        group.options.push(option);
      }

      groupedOptions.push(group);
    }

    return groupedOptions;
  }, [config.fields]);

  return (
    <div style={{display: 'flex', flexDirection: 'row'}}>
      <Space size={[0, 8]}>
        {searchExpression.map((searchTerm) => (
          <Tag key={searchTerm.value}>{searchTerm.label}</Tag>
        ))}
      </Space>
      <AutoComplete
        style={{flex: '1'}}
        options={options}
        bordered={false}
        onSelect={(_: string, selectedOption: AutocompleteOption) => {
          console.log('selectedOption', selectedOption);
          setSearchExpression((prevSearchExpression) => [
            ...prevSearchExpression,
            selectedOption,
          ]);
        }}
        value={null}
      />
    </div>
  );
};

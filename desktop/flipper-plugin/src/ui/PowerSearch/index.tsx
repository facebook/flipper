/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {AutoComplete, Button, Space} from 'antd';
import {
  PowerSearchConfig,
  FieldConfig,
  OperatorConfig,
} from './PowerSearchTypes';

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

type SearchExpressionTerm = {
  field: FieldConfig;
  operator: OperatorConfig;
  searchValue?: string;
};

export const PowerSearch: React.FC<PowerSearchProps> = ({config}) => {
  const [searchExpression, setSearchExpression] = React.useState<
    SearchExpressionTerm[]
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
        {searchExpression.map((searchTerm, i) => (
          <Space key={i.toString()}>
            <Button>{searchTerm.field.label}</Button>
            <Button>{searchTerm.operator.label}</Button>
            <Button>{searchTerm.searchValue}</Button>
          </Space>
        ))}
      </Space>
      <AutoComplete
        style={{flex: '1'}}
        options={options}
        bordered={false}
        onSelect={(_: string, selectedOption: AutocompleteOption) => {
          const [fieldKey, operatorKey] =
            selectedOption.value.split(OPTION_KEY_DELIMITER);
          const fieldConfig = config.fields[fieldKey];
          const operatorConfig = fieldConfig.operators[operatorKey];

          setSearchExpression((prevSearchExpression) => [
            ...prevSearchExpression,
            {
              field: fieldConfig,
              operator: operatorConfig,
            },
          ]);
        }}
        value={''}
      />
    </div>
  );
};

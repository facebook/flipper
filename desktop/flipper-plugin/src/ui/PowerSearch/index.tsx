/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {AutoComplete, Button, Input, Space} from 'antd';
import {
  PowerSearchConfig,
  FieldConfig,
  OperatorConfig,
} from './PowerSearchTypes';
import {CloseOutlined} from '@ant-design/icons';

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

  const lastSearchTermHasSearchValue =
    searchExpression.length > 0
      ? searchExpression[searchExpression.length - 1].searchValue !== undefined
      : false;

  const [searchTermFinderValue, setSearchTermFinderValue] = React.useState<
    string | null
  >(null);

  return (
    <div style={{display: 'flex', flexDirection: 'row'}}>
      <Space size={[0, 8]}>
        {searchExpression.map((searchTerm, i) => {
          const isLastTerm = i === searchExpression.length - 1;

          return (
            <Space.Compact block size="small" key={i.toString()}>
              <Button>{searchTerm.field.label}</Button>
              <Button>{searchTerm.operator.label}</Button>
              {lastSearchTermHasSearchValue || !isLastTerm ? (
                <Button>{searchTerm.searchValue ?? '...'}</Button>
              ) : (
                // TODO: Fix width
                <Input
                  autoFocus
                  style={{width: 100}}
                  placeholder="..."
                  onBlur={(event) => {
                    const newValue = event.target.value;

                    if (!newValue) {
                      setSearchExpression((prevSearchExpression) => {
                        return prevSearchExpression.slice(0, -1);
                      });
                      return;
                    }

                    setSearchExpression((prevSearchExpression) => {
                      return [
                        ...prevSearchExpression.slice(0, -1),
                        {
                          ...prevSearchExpression[
                            prevSearchExpression.length - 1
                          ],
                          searchValue: newValue,
                        },
                      ];
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === 'Escape') {
                      event.currentTarget.blur();
                    }
                  }}
                />
              )}
              <Button
                icon={<CloseOutlined />}
                onClick={() => {
                  setSearchExpression((prevSearchExpression) => {
                    if (prevSearchExpression[i]) {
                      return [
                        ...prevSearchExpression.slice(0, i),
                        ...prevSearchExpression.slice(i + 1),
                      ];
                    }
                    return prevSearchExpression;
                  });
                }}
              />
            </Space.Compact>
          );
        })}
      </Space>
      <AutoComplete<string, AutocompleteOption>
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
          setSearchTermFinderValue(null);
        }}
        filterOption={(inputValue, option) => {
          return !!option?.label
            .toLowerCase()
            .includes(inputValue.toLowerCase());
        }}
        value={searchTermFinderValue}
        onChange={setSearchTermFinderValue}
        onBlur={() => {
          setSearchTermFinderValue(null);
        }}
        onInputKeyDown={(event) => {
          if (event.key === 'Enter') {
            setSearchTermFinderValue(null);
          }
        }}
      />
    </div>
  );
};

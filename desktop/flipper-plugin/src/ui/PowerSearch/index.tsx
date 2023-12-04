/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {
  PowerSearchConfig,
  FieldConfig,
  OperatorConfig,
  EnumLabels,
} from './PowerSearchConfig';
import {PowerSearchContainer} from './PowerSearchContainer';
import {
  PowerSearchTermFinder,
  PowerSearchTermFinderOption,
  PowerSearchTermFinderOptionGroup,
} from './PowerSearchTermFinder';
import {
  IncompleteSearchExpressionTerm,
  PowerSearchTerm,
  SearchExpressionTerm,
} from './PowerSearchTerm';
import {useLatestRef} from '../../utils/useLatestRef';
import {useUpdateEffect} from 'react-use';
import {theme} from '../theme';
import {SearchOutlined} from '@ant-design/icons';
import {getFlipperLib} from '../../plugin/FlipperLib';

export {
  PowerSearchConfig,
  EnumLabels,
  OperatorConfig,
  FieldConfig,
  SearchExpressionTerm,
};

type PowerSearchProps = {
  config: PowerSearchConfig;
  // Overrides current state of the component with every update.
  // It is the way to continuously force update the state of the power search externally.
  // Takes prefernce over `initialSearchExpression`.
  searchExpression?: SearchExpressionTerm[];
  // Component stays uncontrolled and maintains its own state.
  // It is respected only on initialization and any future updates are ignored.
  initialSearchExpression?: SearchExpressionTerm[];
  onSearchExpressionChange: (searchExpression: SearchExpressionTerm[]) => void;
  onConfirmUnknownOption?: (
    searchString: string,
  ) => SearchExpressionTerm | undefined;
};

const OPTION_KEY_DELIMITER = '::';

export const PowerSearch: React.FC<PowerSearchProps> = ({
  config,
  searchExpression: searchExpressionExternal,
  initialSearchExpression,
  onSearchExpressionChange,
  onConfirmUnknownOption,
}) => {
  const [searchExpression, setSearchExpression] = React.useState<
    IncompleteSearchExpressionTerm[]
  >(() => {
    if (searchExpressionExternal) {
      return searchExpressionExternal;
    }
    if (initialSearchExpression) {
      return initialSearchExpression;
    }
    return [];
  });

  const onSearchExpressionChangeLatestRef = useLatestRef(
    onSearchExpressionChange,
  );
  useUpdateEffect(() => {
    if (searchExpression.every((term) => term.searchValue !== undefined)) {
      onSearchExpressionChangeLatestRef.current(
        searchExpression as SearchExpressionTerm[],
      );
      getFlipperLib().logger.track(
        'usage',
        'power-search:search-expression-finalize',
      );
    }
  }, [searchExpression, onSearchExpressionChangeLatestRef]);

  React.useEffect(() => {
    if (searchExpressionExternal) {
      setSearchExpression(searchExpressionExternal);
    }
  }, [searchExpressionExternal]);

  const options: PowerSearchTermFinderOptionGroup[] = React.useMemo(() => {
    const groupedOptions: PowerSearchTermFinderOptionGroup[] = [];

    for (const field of Object.values(config.fields)) {
      const group: PowerSearchTermFinderOptionGroup = {
        label: field.label,
        options: [],
        value: field.key,
      };

      for (const operator of Object.values(field.operators)) {
        const option: PowerSearchTermFinderOption = {
          label: `${field.label} ${operator.label}`,
          value: `${field.key}${OPTION_KEY_DELIMITER}${operator.key}`,
        };
        group.options.push(option);
      }

      groupedOptions.push(group);
    }

    return groupedOptions;
  }, [config.fields]);

  const searchTermFinderRef = React.useRef<{
    focus: () => void;
    blur: () => void;
    scrollTo: () => void;
  }>(null);

  return (
    <PowerSearchContainer>
      <SearchOutlined
        style={{
          margin: theme.space.tiny,
          color: theme.textColorSecondary,
        }}
      />
      {searchExpression.map((searchTerm, i) => {
        return (
          <PowerSearchTerm
            key={JSON.stringify(searchTerm)}
            searchTerm={searchTerm}
            onCancel={() => {
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
            onFinalize={(finalSearchTerm) => {
              setSearchExpression((prevSearchExpression) => {
                return [
                  ...prevSearchExpression.slice(0, i),
                  finalSearchTerm,
                  ...prevSearchExpression.slice(i + 1),
                ];
              });
              // setTimeout allows antd to clear the search input (default behavior when a predefined option is selected) and prevents onChange from firing twice
              // Without it, when you enter a value in the enum_set term to filter available options, and then select on the filtered optiong, onChange fires twice.
              // First, with the selected option. Second, with the search value that you used for filtering.
              setTimeout(() => {
                searchTermFinderRef.current?.focus();
              });
            }}
          />
        );
      })}
      <PowerSearchTermFinder
        ref={searchTermFinderRef}
        options={options}
        onSelect={(selectedOption) => {
          const [fieldKey, operatorKey] =
            selectedOption.value.split(OPTION_KEY_DELIMITER);
          const fieldConfig = config.fields[fieldKey];
          const operatorConfig = fieldConfig.operators[operatorKey];

          setSearchExpression((prevSearchExpression) => [
            ...prevSearchExpression,
            {
              field: fieldConfig,
              operator: operatorConfig,
              searchValue:
                operatorConfig.valueType === 'NO_VALUE' ? null : undefined,
            },
          ]);
        }}
        onBackspacePressWhileEmpty={() => {
          setSearchExpression((prevSearchExpression) => {
            return prevSearchExpression.slice(
              0,
              prevSearchExpression.length - 1,
            );
          });
        }}
        onConfirmUnknownOption={
          onConfirmUnknownOption
            ? (searchString) => {
                const searchExpressionTerm =
                  onConfirmUnknownOption(searchString);

                if (searchExpressionTerm) {
                  setSearchExpression((prevSearchExpression) => [
                    ...prevSearchExpression,
                    searchExpressionTerm,
                  ]);
                }
              }
            : undefined
        }
      />
    </PowerSearchContainer>
  );
};

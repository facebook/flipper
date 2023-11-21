/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {AutoComplete, Input} from 'antd';
import * as React from 'react';

export type PowerSearchTermFinderOption = {label: string; value: string};
export type PowerSearchTermFinderOptionGroup = {
  label: string;
  options: PowerSearchTermFinderOption[];
  value: string;
};
export type PowerSearchTermFinderRef = {
  focus: () => void;
  blur: () => void;
};

type PowerSearchTermFinderProps = {
  options: PowerSearchTermFinderOptionGroup[];
  onSelect: (selectedOption: PowerSearchTermFinderOption) => void;
  onBackspacePressWhileEmpty: () => void;
  onConfirmUnknownOption?: (searchString: string) => void;
};

export const PowerSearchTermFinder = React.forwardRef<
  PowerSearchTermFinderRef,
  PowerSearchTermFinderProps
>(
  (
    {options, onSelect, onBackspacePressWhileEmpty, onConfirmUnknownOption},
    ref,
  ) => {
    const [searchTermFinderValue, setSearchTermFinderValue] = React.useState<
      string | null
    >(null);

    return (
      <AutoComplete<string, PowerSearchTermFinderOption>
        ref={
          ref as React.Ref<{
            focus: () => void;
            blur: () => void;
            scrollTo: () => void;
          }>
        }
        style={{flex: '1', minWidth: 200}}
        options={options}
        bordered={false}
        onSelect={(_: string, selectedOption: PowerSearchTermFinderOption) => {
          onSelect(selectedOption);
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
        }}>
        <Input
          size="small"
          bordered={false}
          onKeyUp={(event) => {
            if (event.key === 'Enter') {
              if (searchTermFinderValue && onConfirmUnknownOption) {
                onConfirmUnknownOption(searchTermFinderValue);
              }
              setSearchTermFinderValue(null);
            }
            if (event.key === 'Backspace' && !searchTermFinderValue) {
              onBackspacePressWhileEmpty();
            }
          }}
          onPasteCapture={(event) => {
            const text = event.clipboardData.getData('text/plain');

            if (text && onConfirmUnknownOption) {
              event.stopPropagation();
              event.preventDefault();

              onConfirmUnknownOption(text);
              setSearchTermFinderValue(null);
            }
          }}
        />
      </AutoComplete>
    );
  },
);

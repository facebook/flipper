/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button, Select} from 'antd';
import React from 'react';
import {EnumLabels} from './PowerSearchConfig';

type PowerSearchEnumTermProps = {
  onCancel: () => void;
  onChange: (value: string) => void;
  enumLabels: EnumLabels;
  defaultValue?: string;
  allowFreeform?: boolean;
};

export const PowerSearchEnumTerm: React.FC<PowerSearchEnumTermProps> = ({
  onCancel,
  onChange,
  enumLabels,
  defaultValue,
  allowFreeform,
}) => {
  const [editing, setEditing] = React.useState(!defaultValue);

  const options = React.useMemo(() => {
    return Object.entries(enumLabels).map(([key, label]) => ({
      label,
      value: key,
    }));
  }, [enumLabels]);

  const width = React.useMemo(() => {
    const minWidth = 100;
    const maxWidth = 250;

    let longestOptionLabelWidth = 0;
    Object.values(enumLabels).forEach((label) => {
      if (label.toString().length > longestOptionLabelWidth) {
        longestOptionLabelWidth = label.toString().length;
      }
    });

    // 10px is an emperically calculated multiplier.
    // A proper way to do it is to actually render the longest option and measure it
    // But then we will have to render top X longest options,
    // because, potentially, a string with X reeeeally wide chars could be longer than X+1 narrow chars.
    // Anyhow, it seems too complex for such a simple thing a detecting the width of the select and teh dropdown
    // (the dropdown is the one that actually matters from the UX perspective - users use it to select the option they want)
    // Feel to increase 10 to any other value if necessary (11?)
    const longestOptionsLabelWidthPx = longestOptionLabelWidth * 10;

    if (longestOptionsLabelWidthPx < minWidth) {
      return minWidth;
    }

    if (longestOptionsLabelWidthPx > maxWidth) {
      return maxWidth;
    }

    return longestOptionsLabelWidthPx;
  }, [enumLabels]);

  const selectValueRef = React.useRef<string>();
  if (defaultValue && !selectValueRef.current) {
    selectValueRef.current = defaultValue;
  }

  if (editing) {
    return (
      <Select
        mode={allowFreeform ? 'tags' : undefined}
        autoFocus
        style={{width}}
        placeholder="..."
        options={options}
        defaultOpen
        onBlur={() => {
          if (!selectValueRef.current) {
            onCancel();
          }
          setEditing(false);
        }}
        onSelect={(value) => {
          selectValueRef.current = value;
          onChange(value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.currentTarget.blur();
          }
        }}
        defaultValue={defaultValue}
      />
    );
  }

  return (
    <Button onClick={() => setEditing(true)}>
      {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
      {enumLabels[defaultValue!] ?? defaultValue}
    </Button>
  );
};

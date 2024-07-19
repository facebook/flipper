/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {theme, Layout, styled} from 'flipper-plugin';
import React from 'react';
import {Color} from '../../../ClientTypes';
import {InspectableColor} from '../../../ClientTypes';
import {NumberGroup} from './NumericInputs';
import {opactity, rowHeight, stringColor} from './shared';
import {StyledTextArea} from './TextInput';
import {Popover} from 'antd';
import {SketchPicker} from 'react-color';
import {useOptimisticValue} from './useOptimisticValue';

export function ColorInspector({
  inspectable,
  onChange,
  mutable,
}: {
  inspectable: InspectableColor;
  mutable: boolean;
  onChange: (color: Color) => void;
}) {
  const optimisticValue = useOptimisticValue(inspectable.value, onChange);

  let colorPreviewComponent = (
    <ColorPreview
      background={`rgba(${inspectable.value.r},${inspectable.value.g},${inspectable.value.b},${inspectable.value.a})`}
    />
  );

  if (mutable) {
    colorPreviewComponent = (
      <Popover
        content={
          <SketchPicker
            color={optimisticValue.value}
            onChange={(color) => {
              optimisticValue.onChange({...color.rgb, a: color.rgb.a ?? 1});
            }}
          />
        }>
        {colorPreviewComponent}
      </Popover>
    );
  }

  return (
    <Layout.Container gap="small" style={opactity(optimisticValue)}>
      <Layout.Horizontal gap="medium">
        {colorPreviewComponent}
        <StyledTextArea
          color={stringColor}
          mutable={false}
          onChange={() => {}}
          value={RGBAtoHEX(inspectable.value)}
        />
      </Layout.Horizontal>
      <NumberGroup
        values={[
          {
            value: inspectable.value.r,
            addonText: 'R',
            mutable,
            hint: 'COLOR',
            min: 0,
            max: 255,
            onChange: (updated) => onChange({...inspectable.value, r: updated}),
          },
          {
            value: inspectable.value.g,
            addonText: 'G',
            mutable,
            hint: 'COLOR',
            min: 0,
            max: 255,
            onChange: (updated) => onChange({...inspectable.value, g: updated}),
          },
          {
            value: inspectable.value.b,
            addonText: 'B',
            mutable,
            hint: 'COLOR',
            min: 0,
            max: 255,
            onChange: (updated) => onChange({...inspectable.value, b: updated}),
          },
          {
            value: inspectable.value.a,
            addonText: 'A',
            min: 0,
            max: 1,
            mutable,
            hint: 'COLOR',
            onChange: (updated) => onChange({...inspectable.value, a: updated}),
          },
        ]}
      />
    </Layout.Container>
  );
}

const ColorPreview = styled.div(({background}: {background: string}) => ({
  width: rowHeight,
  height: rowHeight,
  borderRadius: '8px',
  borderColor: theme.disabledColor,
  borderStyle: 'solid',
  boxSizing: 'border-box',
  borderWidth: '1px',
  backgroundColor: background,
}));

const RGBAtoHEX = (color: Color) => {
  const hex =
    (color.r | (1 << 8)).toString(16).slice(1) +
    (color.g | (1 << 8)).toString(16).slice(1) +
    (color.b | (1 << 8)).toString(16).slice(1);

  return `#${hex.toUpperCase()}`;
};

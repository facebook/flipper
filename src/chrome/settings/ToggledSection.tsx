/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {FlexColumn, styled, FlexRow, ToggleButton} from 'flipper';
import React from 'react';

const IndentedSection = styled(FlexColumn)({
  paddingLeft: 50,
});
const GreyedOutOverlay = styled('div')({
  backgroundColor: '#EFEEEF',
  borderRadius: 4,
  opacity: 0.6,
  height: '100%',
  position: 'absolute',
  left: 50,
  right: 0,
});

export default function ToggledSection(props: {
  label: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <FlexColumn>
      <FlexRow>
        <ToggleButton
          label={props.label}
          onClick={() => props.onChange(!props.enabled)}
          toggled={props.enabled}
        />
      </FlexRow>
      <IndentedSection>
        {props.children}
        {props.enabled ? null : <GreyedOutOverlay />}
      </IndentedSection>
    </FlexColumn>
  );
}

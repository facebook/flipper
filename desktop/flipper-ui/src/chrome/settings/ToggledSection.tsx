/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlexColumn, styled, FlexRow, ToggleButton} from '../../ui';
import React from 'react';
import {theme} from 'flipper-plugin';

const IndentedSection = styled(FlexColumn)({
  paddingLeft: 50,
  paddingBottom: 10,
});
const GrayedOutOverlay = styled.div({
  background: theme.backgroundDefault,
  borderRadius: 4,
  opacity: 0.6,
  height: '100%',
  position: 'absolute',
  left: 0,
  right: 0,
});

export default function ToggledSection(props: {
  label: string;
  toggled: boolean;
  onChange?: (value: boolean) => void;
  children?: React.ReactNode;
  // Whether to disallow interactions with this toggle
  frozen?: boolean;
}) {
  return (
    <FlexColumn>
      <FlexRow>
        <ToggleButton
          label={props.label}
          onClick={() => props.onChange && props.onChange(!props.toggled)}
          toggled={props.toggled}
        />
        {props.frozen && <GrayedOutOverlay />}
      </FlexRow>
      <IndentedSection>
        {props.children}
        {props.toggled || props.frozen
          ? null
          : props.children && <GrayedOutOverlay />}
      </IndentedSection>
    </FlexColumn>
  );
}

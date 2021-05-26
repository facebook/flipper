/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PureComponent} from 'react';
import styled from '@emotion/styled';
import React from 'react';

type RadioProps = {
  /** Whether the radio button is checked. */
  checked: boolean;
  /** Called when a state change is triggered */
  onChange: (selected: boolean) => void;
  disabled?: boolean;
};

const RadioboxContainer = styled.input({
  display: 'inline-block',
  marginRight: 5,
  verticalAlign: 'middle',
});
RadioboxContainer.displayName = 'Radiobox:RadioboxContainer';

/**
 * A radio button to toggle UI state
 * @deprecated use Radio from 'antd'
 */
export default class Radio extends PureComponent<RadioProps> {
  onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.props.onChange(e.target.checked);
  };

  render() {
    return (
      <RadioboxContainer
        type="radio"
        checked={this.props.checked}
        onChange={this.onChange}
        disabled={this.props.disabled}
      />
    );
  }
}

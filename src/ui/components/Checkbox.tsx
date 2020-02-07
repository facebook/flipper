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

type CheckboxProps = {
  /** Whether the checkbox is checked. */
  checked: boolean;
  /** Called when a state change is triggered */
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

const CheckboxContainer = styled.input({
  display: 'inline-block',
  marginRight: 5,
  verticalAlign: 'middle',
});
CheckboxContainer.displayName = 'Checkbox:CheckboxContainer';

/**
 * A checkbox to toggle UI state
 */
export default class Checkbox extends PureComponent<CheckboxProps> {
  onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.props.onChange(e.target.checked);
  };

  render() {
    return (
      <CheckboxContainer
        type="checkbox"
        checked={this.props.checked}
        onChange={this.onChange}
        disabled={this.props.disabled}
      />
    );
  }
}

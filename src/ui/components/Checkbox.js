/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {PureComponent} from 'react';
import styled from '../styled/index.js';

type CheckboxProps = {
  checked: boolean,
  onChange: (checked: boolean) => void,
};

const CheckboxContainer = styled.textInput({
  display: 'inline-block',
  marginRight: 5,
  verticalAlign: 'middle',
});

export default class Checkbox extends PureComponent<CheckboxProps> {
  onChange = (e: SyntheticInputEvent<HTMLInputElement>) => {
    this.props.onChange(e.target.checked);
  };

  render() {
    return (
      <CheckboxContainer
        type="checkbox"
        checked={this.props.checked}
        onChange={this.onChange}
      />
    );
  }
}

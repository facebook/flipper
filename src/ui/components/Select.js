/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Component} from 'react';
import Text from './Text';
import styled from '../styled';

const Label = styled('label')({
  display: 'flex',
  alignItems: 'center',
});

const LabelText = styled(Text)({
  fontWeight: '500',
  marginRight: 5,
});

const SelectMenu = styled('select')(({grow}) => ({
  flexGrow: grow ? 1 : null,
}));

/**
 * Dropdown to select from a list of options
 */
export default class Select extends Component<{
  /** Additional className added to the element */
  className?: string,
  /** Additional className added to the element */
  options: {
    [key: string]: string,
  },
  /** Callback when the selected value changes */
  onChange: (key: string) => void,
  /** Selected key */
  selected?: ?string,
  /** Label shown next to the dropdown */
  label?: string,
  /** Select box should take all available space */
  grow?: boolean,
}> {
  selectID: string = Math.random().toString(36);

  onChange = (event: Object) => {
    this.props.onChange(event.target.value);
  };

  render() {
    const {className, options, selected, label, grow} = this.props;

    let select = (
      <SelectMenu
        grow={grow}
        id={this.selectID}
        onChange={this.onChange}
        className={className}>
        {Object.keys(options).map(key => (
          <option selected={key === selected}>{options[key]}</option>
        ))}
      </SelectMenu>
    );

    if (label) {
      select = (
        <Label for={this.selectID}>
          <LabelText>{label}</LabelText>
          {select}
        </Label>
      );
    }

    return select;
  }
}

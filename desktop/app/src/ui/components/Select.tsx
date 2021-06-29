/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Component, CSSProperties} from 'react';
import Text from './Text';
import styled from '@emotion/styled';
import React from 'react';
import {theme} from 'flipper-plugin';

const Label = styled.label({
  display: 'flex',
  alignItems: 'center',
});
Label.displayName = 'Select:Label';

const LabelText = styled(Text)({
  fontWeight: 500,
  marginRight: 5,
});
LabelText.displayName = 'Select:LabelText';

const SelectMenu = styled.select<{grow?: boolean}>((props) => ({
  flexGrow: props.grow ? 1 : 0,
  background: theme.backgroundDefault,
  border: `1px solid ${theme.dividerColor}`,
}));
SelectMenu.displayName = 'Select:SelectMenu';

/**
 * Dropdown to select from a list of options
 * @deprecated use Select from antd instead: https://ant.design/components/select/
 */
export default class Select extends Component<{
  /** Additional className added to the element */
  className?: string;
  /** The list of options to display */
  options: {
    [key: string]: string;
  };
  /** DEPRECATED: Callback when the selected value changes. The callback is called with the displayed value. */
  onChange?: (value: string) => void;

  /** Callback when the selected value changes. The callback is called with the key for the displayed value */
  onChangeWithKey?: (key: string) => void;

  /** Selected key */
  selected?: string | null | undefined;
  /** Label shown next to the dropdown */
  label?: string;
  /** Select box should take all available space */
  grow?: boolean;

  /** Whether the user can interact with the select and change the selcted option */
  disabled?: boolean;
  style?: CSSProperties;
}> {
  selectID: string = Math.random().toString(36);

  onChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (this.props.onChangeWithKey) {
      this.props.onChangeWithKey(event.target.value);
    }
    if (this.props.onChange) {
      this.props.onChange(this.props.options[event.target.value]);
    }
  };

  render() {
    const {className, options, selected, label, grow, disabled, style} =
      this.props;

    let select = (
      <SelectMenu
        grow={grow}
        id={this.selectID}
        onChange={this.onChange}
        className={className}
        disabled={disabled}
        value={selected || ''}
        style={style}>
        {Object.keys(options).map((key, index) => (
          <option value={key} key={index}>
            {options[key]}
          </option>
        ))}
      </SelectMenu>
    );

    if (label) {
      select = (
        <Label htmlFor={this.selectID}>
          <LabelText>{label}</LabelText>
          {select}
        </Label>
      );
    }

    return select;
  }
}

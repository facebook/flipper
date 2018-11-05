/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Component} from 'react';

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
}> {
  onChange = (event: Object) => {
    this.props.onChange(event.target.value);
  };

  render() {
    const {className, options, selected} = this.props;

    return (
      <select onChange={this.onChange} className={className}>
        {Object.keys(options).map(key => (
          <option selected={key === selected}>{options[key]}</option>
        ))}
      </select>
    );
  }
}

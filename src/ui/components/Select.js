/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Component} from 'react';

export default class Select extends Component<{
  className?: string,
  options: {
    [key: string]: string,
  },
  onChange: (key: string) => void,
  selected?: ?string,
}> {
  render() {
    const {className, options, selected} = this.props;

    return (
      <select onChange={this.props.onChange} className={className}>
        {Object.keys(options).map(key => (
          <option selected={key === selected}>{options[key]}</option>
        ))}
      </select>
    );
  }
}

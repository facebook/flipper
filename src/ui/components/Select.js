/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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

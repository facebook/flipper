/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {Component} from 'react';
import {Layout} from 'flipper-plugin';
import {Button, Menu, Checkbox, Dropdown} from 'antd';
import {DownOutlined} from '@ant-design/icons';
import type {CheckboxChangeEvent} from 'antd/lib/checkbox';

export default class MultipleSelect extends Component<{
  selected: Set<string>;
  options: Set<string>;
  label: string;
  onChange: (selectedItem: string, checked: boolean) => void;
}> {
  handleOnChange = (option: string, event: CheckboxChangeEvent) => {
    this.props.onChange(option, event.target.checked);
  };

  menu = () => {
    return (
      <Menu>
        {Array.from(this.props.options).map((option, index) => (
          <Menu.Item key={index} disabled>
            <Checkbox
              onChange={(e) => this.handleOnChange(option, e)}
              checked={this.props.selected.has(option)}
            />{' '}
            {option}
          </Menu.Item>
        ))}
      </Menu>
    );
  };

  render() {
    return (
      <Layout.Container>
        <Dropdown overlay={this.menu}>
          <Button>
            Surfaces <DownOutlined />
          </Button>
        </Dropdown>
      </Layout.Container>
    );
  }
}

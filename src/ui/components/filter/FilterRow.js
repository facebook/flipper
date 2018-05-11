/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Filter} from './types.js';
import {PureComponent} from 'react';
import ContextMenu from '../ContextMenu.js';
import textContent from '../../../utils/textContent.js';
import styled from '../../styled/index.js';
import {colors} from '../colors.js';

const FilterText = styled.view(
  {
    display: 'flex',
    alignSelf: 'baseline',
    userSelect: 'none',
    cursor: 'pointer',
    position: 'relative',
    maxWidth: '100%',
    '&:hover': {
      color: colors.white,
    },
    '&:hover::after': {
      content: '""',
      position: 'absolute',
      top: 3,
      bottom: -2,
      left: -6,
      right: -6,
      borderRadius: '999em',
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    '&:hover *': {
      color: `${colors.white} !important`,
      zIndex: 2,
    },
  },
  {
    ignoreAttributes: ['filterKey', 'addFilter'],
  },
);

type Props = {
  children: React.Node,
  addFilter: (filter: Filter) => void,
  filterKey: string,
};

export default class FilterRow extends PureComponent<Props> {
  onClick = (e: SyntheticMouseEvent<>) => {
    if (e.button === 0) {
      this.props.addFilter({
        type: e.metaKey || e.altKey ? 'exclude' : 'include',
        key: this.props.filterKey,
        value: textContent(this.props.children),
      });
    }
  };

  menuItems = [
    {
      label: 'Filter this value',
      click: () =>
        this.props.addFilter({
          type: 'include',
          key: this.props.filterKey,
          value: textContent(this.props.children),
        }),
    },
  ];

  render() {
    const {children, ...props} = this.props;

    return (
      <ContextMenu
        items={this.menuItems}
        component={FilterText}
        onClick={this.onClick}
        {...props}>
        {children}
      </ContextMenu>
    );
  }
}

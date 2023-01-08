/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Menu} from 'antd';
import {usePlugin, useValue} from 'flipper-plugin';
import {plugin} from '../../index';
import React from 'react';

/**
 * The Menu item visibility event does not fire when a menu item is clicked.
 * This is apparently by design https://github.com/ant-design/ant-design/issues/4994#issuecomment-281585872
 * This component simply wraps a menu item but will ensure that  the atom is set to false when an item is clicked.
 * Additionally, it ensures menu items do not render when the atom is false
 */
export const UIDebuggerMenuItem: React.FC<{
  text: string;
  onClick: () => void;
}> = ({text, onClick}) => {
  const instance = usePlugin(plugin);

  const isMenuOpen = useValue(instance.uiState.isContextMenuOpen);
  /**
   * The menu is not a controlled component and seems to be a bit slow to close when user clicks on it.
   * React may rerender the menu before it has time to close resulting in seeing an incorrect context menu for a frame.
   * This is here to just hide all the menu items when the menu closes. A little strange but works well in practice.
   */
  if (!isMenuOpen) {
    return null;
  }
  return (
    <Menu.Item
      onClick={() => {
        onClick();
        instance.uiState.isContextMenuOpen.set(false);
      }}>
      {text}
    </Menu.Item>
  );
};

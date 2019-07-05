/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

type Electron$MenuRoles =
  | 'undo'
  | 'redo'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'pasteandmatchstyle'
  | 'selectall'
  | 'delete'
  | 'minimize'
  | 'close'
  | 'quit'
  | 'togglefullscreen' // macOS-only
  | 'about'
  | 'hide'
  | 'hideothers'
  | 'unhide'
  | 'front'
  | 'zoom'
  | 'window'
  | 'help'
  | 'services';

type Electron$MenuType =
  | 'normal'
  | 'separator'
  | 'submenu'
  | 'checkbox'
  | 'radio';

type MenuItemConstructorOptions = {|
  click?: (
    menuItem: Electron$MenuItem,
    browserWindow: Object,
    event: Object,
  ) => mixed,
  role?: Electron$MenuRoles,
  type?: Electron$MenuType,
  label?: string,
  sublabel?: string,
  accelerator?: string,
  icon?: Object,
  enabled?: boolean,
  visible?: boolean,
  checked?: boolean,
  submenu?: Array<MenuItemConstructorOptions>,
  id?: string,
  position?: string,
|};

declare class Electron$MenuItem {
  constructor(options: MenuItemConstructorOptions): Electron$MenuItem;
  enabled: boolean;
  visible: boolean;
  checked: boolean;
}

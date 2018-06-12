/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

type Electron$BrowserWindow = any;
type Electron$NativeImage = any;

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

type Electron$MenuItemOptions = {
  click?: (
    menuItem: Electron$MenuItem,
    browserWindow: Object,
    event: Object,
  ) => void,
  role?: Electron$MenuRoles,
  type?: Electron$MenuType,
  label?: string,
  sublabel?: string,
  accelerator?: string,
  icon?: Object,
  enabled?: boolean,
  visible?: boolean,
  checked?: boolean,
  submenu?: Electron$MenuItem | Electron$MenuItemOptions,
  id?: string,
  position?: string,
};

declare class Electron$MenuItem {
  constructor: (options: Electron$MenuItemOptions) => void;
  enabled: boolean;
  visible: boolean;
  checked: boolean;
}

declare class Electron$Menu {
  static setApplicationMenu: (menu: Electron$Menu) => void;
  static getApplicationMenu: () => ?Electron$Menu;
  static sendActionToFirstResponder: (action: string) => void;
  static buildFromTemplate: (
    templates: Array<Electron$MenuItemOptions>,
  ) => Electron$Menu;
  popup: (
    browserWindow: Object,
    x?: number,
    y?: number,
    positioningItem?: number,
  ) => void;
  popup: (x?: number, y?: number, positioningItem?: number) => void;
  append: (menuItem: Electron$MenuItem) => void;
  insert: (pos: number, menuItem: Electron$MenuItem) => void;
  items: Array<Electron$MenuItem>;
}

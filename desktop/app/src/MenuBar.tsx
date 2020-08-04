/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperPlugin, FlipperDevicePlugin, PluginDefinition} from './plugin';
import {
  showOpenDialog,
  startFileExport,
  startLinkExport,
} from './utils/exportData';
import {
  setActiveSheet,
  ACTIVE_SHEET_PLUGINS,
  ACTIVE_SHEET_SETTINGS,
  ACTIVE_SHEET_CHANGELOG,
} from './reducers/application';
import {setStaticView} from './reducers/connections';
import SupportRequestFormV2 from './fb-stubs/SupportRequestFormV2';
import {Store} from './reducers/';
import electron, {MenuItemConstructorOptions} from 'electron';
import {notNull} from './utils/typeUtils';
import constants from './fb-stubs/constants';
import {Logger} from './fb-interfaces/Logger';
import {NormalizedMenuEntry, buildInMenuEntries} from 'flipper-plugin';

export type DefaultKeyboardAction = keyof typeof buildInMenuEntries;
export type TopLevelMenu = 'Edit' | 'View' | 'Window' | 'Help';

export type KeyboardAction = {
  action: string;
  label: string;
  accelerator?: string;
  topLevelMenu: TopLevelMenu;
};

export type KeyboardActions = Array<DefaultKeyboardAction | KeyboardAction>;

const menuItems: Map<string, electron.MenuItem> = new Map();

let pluginActionHandler: ((action: string) => void) | null;
function actionHandler(action: string) {
  if (pluginActionHandler) {
    pluginActionHandler(action);
  } else {
    console.warn(`Unhandled keyboard action "${action}".`);
  }
}

export function setupMenuBar(
  plugins: PluginDefinition[],
  store: Store,
  logger: Logger,
) {
  const template = getTemplate(
    electron.remote.app,
    electron.remote.shell,
    store,
    logger,
  );
  // collect all keyboard actions from all plugins
  const registeredActions = new Set(
    plugins
      .map((plugin) => plugin.keyboardActions || [])
      .flat()
      .map((action: DefaultKeyboardAction | KeyboardAction) =>
        typeof action === 'string' ? buildInMenuEntries[action] : action,
      )
      .filter(notNull),
  );

  // add keyboard actions to
  registeredActions.forEach((keyboardAction) => {
    if (keyboardAction != null) {
      appendMenuItem(template, keyboardAction);
    }
  });

  // create actual menu instance
  const applicationMenu = electron.remote.Menu.buildFromTemplate(template);

  // add menu items to map, so we can modify them easily later
  registeredActions.forEach((keyboardAction) => {
    if (keyboardAction != null) {
      const {topLevelMenu, label, action} = keyboardAction;
      const menu = applicationMenu.items.find(
        (menuItem) => menuItem.label === topLevelMenu,
      );
      if (menu && menu.submenu) {
        const menuItem = menu.submenu.items.find(
          (menuItem) => menuItem.label === label,
        );
        menuItem && menuItems.set(action, menuItem);
      }
    }
  });

  // update menubar
  electron.remote.Menu.setApplicationMenu(applicationMenu);
}

function appendMenuItem(
  template: Array<MenuItemConstructorOptions>,
  item: KeyboardAction,
) {
  const keyboardAction = item;
  if (keyboardAction == null) {
    return;
  }
  const itemIndex = template.findIndex(
    (menu) => menu.label === keyboardAction.topLevelMenu,
  );
  if (itemIndex > -1 && template[itemIndex].submenu != null) {
    (template[itemIndex].submenu as MenuItemConstructorOptions[]).push({
      click: () => actionHandler(keyboardAction.action),
      label: keyboardAction.label,
      accelerator: keyboardAction.accelerator,
      enabled: false,
    });
  }
}

export function activateMenuItems(
  activePlugin:
    | FlipperPlugin<any, any, any>
    | FlipperDevicePlugin<any, any, any>,
) {
  // disable all keyboard actions
  for (const item of menuItems) {
    item[1].enabled = false;
  }

  // set plugin action handler
  if (activePlugin.onKeyboardAction) {
    pluginActionHandler = activePlugin.onKeyboardAction;
  }

  // enable keyboard actions for the current plugin
  if (activePlugin.constructor.keyboardActions != null) {
    (activePlugin.constructor.keyboardActions || []).forEach(
      (keyboardAction) => {
        const action =
          typeof keyboardAction === 'string'
            ? keyboardAction
            : keyboardAction.action;
        const item = menuItems.get(action);
        if (item != null) {
          item.enabled = true;
        }
      },
    );
  }

  // set the application menu again to make sure it updates
  electron.remote.Menu?.setApplicationMenu(
    electron.remote.Menu.getApplicationMenu(),
  );
}

export function addSandyPluginEntries(entries: NormalizedMenuEntry[]) {
  if (!electron.remote.Menu) {
    return;
  }

  // disable all keyboard actions
  for (const item of menuItems) {
    item[1].enabled = false;
  }

  pluginActionHandler = (action: string) => {
    entries.find((e) => e.action === action)?.handler();
  };

  let changedItems = false;
  const currentMenu = electron.remote.Menu.getApplicationMenu();
  for (const entry of entries) {
    const item = menuItems.get(entry.action!);
    if (item) {
      item.enabled = true;
      item.accelerator = entry.accelerator;
    } else {
      const parent = currentMenu?.items.find(
        (i) => i.label === entry.topLevelMenu,
      );
      if (parent) {
        const item = new electron.remote.MenuItem({
          enabled: true,
          click: () => pluginActionHandler?.(entry.action!),
          label: entry.label,
          accelerator: entry.accelerator,
        });
        parent.submenu!.append(item);
        menuItems.set(entry.action!, item);
        changedItems = true;
      }
    }
  }
  if (changedItems) {
    electron.remote.Menu.setApplicationMenu(currentMenu);
  }
}

function getTemplate(
  app: electron.App,
  shell: electron.Shell,
  store: Store,
  logger: Logger,
): Array<MenuItemConstructorOptions> {
  const exportSubmenu = [
    {
      label: 'File...',
      accelerator: 'CommandOrControl+E',
      click: () => startFileExport(store.dispatch),
    },
  ];
  if (constants.ENABLE_SHAREABLE_LINK) {
    exportSubmenu.push({
      label: 'Shareable Link',
      accelerator: 'CommandOrControl+Shift+E',
      click: () => startLinkExport(store.dispatch),
    });
  }
  const fileSubmenu: MenuItemConstructorOptions[] = [
    {
      label: 'Preferences',
      accelerator: 'Cmd+,',
      click: () => store.dispatch(setActiveSheet(ACTIVE_SHEET_SETTINGS)),
    },
    {
      label: 'Import Flipper File...',
      accelerator: 'CommandOrControl+O',
      click: function () {
        showOpenDialog(store);
      },
    },
    {
      label: 'Export',
      submenu: exportSubmenu,
    },
  ];
  const supportRequestSubmenu = [
    {
      label: 'Create...',
      click: function () {
        // Dispatch an action to open the export screen of Support Request form
        store.dispatch(setStaticView(SupportRequestFormV2));
      },
    },
  ];
  fileSubmenu.push({
    label: 'Support Requests',
    submenu: supportRequestSubmenu,
  });

  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: fileSubmenu,
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo',
        },
        {
          label: 'Redo',
          accelerator: 'Shift+CmdOrCtrl+Z',
          role: 'redo',
        },
        {
          type: 'separator',
        },
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut',
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy',
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste',
        },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectAll',
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: function (
            _,
            focusedWindow: electron.BrowserWindow | undefined,
          ) {
            if (focusedWindow) {
              logger.track('usage', 'reload');
              focusedWindow.reload();
            }
          },
        },
        {
          label: 'Toggle Full Screen',
          accelerator: (function () {
            if (process.platform === 'darwin') {
              return 'Ctrl+Command+F';
            } else {
              return 'F11';
            }
          })(),
          click: function (
            _,
            focusedWindow: electron.BrowserWindow | undefined,
          ) {
            if (focusedWindow) {
              focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
            }
          },
        },
        {
          label: 'Manage Plugins...',
          click: function () {
            store.dispatch(setActiveSheet(ACTIVE_SHEET_PLUGINS));
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: (function () {
            if (process.platform === 'darwin') {
              return 'Alt+Command+I';
            } else {
              return 'Ctrl+Shift+I';
            }
          })(),
          click: function (
            _,
            focusedWindow: electron.BrowserWindow | undefined,
          ) {
            if (focusedWindow) {
              // @ts-ignore: https://github.com/electron/electron/issues/7832
              focusedWindow.toggleDevTools();
            }
          },
        },
        {
          type: 'separator',
        },
      ],
    },
    {
      label: 'Window',
      role: 'window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize',
        },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          role: 'close',
        },
      ],
    },
    {
      label: 'Help',
      role: 'help',
      submenu: [
        {
          label: 'Getting started',
          click: function () {
            shell.openExternal(
              'https://fbflipper.com/docs/getting-started/index',
            );
          },
        },
        {
          label: 'Create plugins',
          click: function () {
            shell.openExternal('https://fbflipper.com/docs/tutorial/intro');
          },
        },
        {
          label: 'Report problems',
          click: function () {
            shell.openExternal(constants.FEEDBACK_GROUP_LINK);
          },
        },
        {
          label: 'Changelog',
          click() {
            store.dispatch(setActiveSheet(ACTIVE_SHEET_CHANGELOG));
          },
        },
      ],
    },
  ];

  if (process.platform === 'darwin') {
    const name = app.name;
    template.unshift({
      label: name,
      submenu: [
        {
          label: 'About ' + name,
          role: 'about',
        },
        {
          type: 'separator',
        },
        {
          label: 'Services',
          role: 'services',
          submenu: [],
        },
        {
          type: 'separator',
        },
        {
          label: 'Hide ' + name,
          accelerator: 'Command+H',
          role: 'hide',
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          role: 'hideOthers',
        },
        {
          label: 'Show All',
          role: 'unhide',
        },
        {
          type: 'separator',
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: function () {
            app.quit();
          },
        },
      ],
    });
    const windowMenu = template.find(function (m) {
      return m.role === 'window';
    });
    if (windowMenu) {
      (windowMenu.submenu as MenuItemConstructorOptions[]).push(
        {
          type: 'separator',
        },
        {
          label: 'Bring All to Front',
          role: 'front',
        },
      );
    }
  }

  return template;
}

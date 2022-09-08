/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// eslint-disable-next-line no-restricted-imports
import electron, {MenuItemConstructorOptions} from 'electron';
import {ElectronIpcClientMain} from './electronIpcMain';

export function setupMenuBar(electronIpcClient: ElectronIpcClientMain) {
  function trackMenuItems(
    menu: 'view' | 'root',
    items: MenuItemConstructorOptions[],
  ) {
    items.forEach((item) => {
      if (item.label && item.click) {
        electronIpcClient.send('menuItemAction', {
          menu,
          label: item.label,
          action: 'click',
        });
      }
    });
  }

  const template = getTemplate(trackMenuItems);
  // create actual menu instance
  const applicationMenu = electron.Menu.buildFromTemplate(template);
  // update menubar
  electron.Menu.setApplicationMenu(applicationMenu);
}

function getTemplate(
  trackMenuItems: (
    menu: 'view' | 'root',
    items: MenuItemConstructorOptions[],
  ) => void,
): Array<MenuItemConstructorOptions> {
  const viewMenu: MenuItemConstructorOptions[] = [
    {
      label: 'Reload',
      accelerator: 'CmdOrCtrl+R',
      click: function (_, focusedWindow: electron.BrowserWindow | undefined) {
        focusedWindow?.reload();
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
      click: function (_, focusedWindow: electron.BrowserWindow | undefined) {
        if (focusedWindow) {
          focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
        }
      },
    },
    {
      label: 'Actual Size',
      accelerator: (function () {
        return 'CmdOrCtrl+0';
      })(),
      click: function (_, focusedWindow: electron.BrowserWindow | undefined) {
        if (focusedWindow) {
          focusedWindow.webContents.setZoomLevel(0);
        }
      },
    },
    {
      label: 'Zoom In',
      accelerator: (function () {
        return 'CmdOrCtrl+=';
      })(),
      click: function (_, focusedWindow: electron.BrowserWindow | undefined) {
        if (focusedWindow) {
          const webContents = focusedWindow.webContents;
          webContents.setZoomLevel(webContents.getZoomLevel() + 1);
        }
      },
    },
    {
      label: 'Zoom Out',
      accelerator: (function () {
        return 'CmdOrCtrl+-';
      })(),
      click: function (_, focusedWindow: electron.BrowserWindow | undefined) {
        if (focusedWindow) {
          const webContents = focusedWindow.webContents;
          webContents.setZoomLevel(webContents.getZoomLevel() - 1);
        }
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
      click: function (_, focusedWindow: electron.BrowserWindow | undefined) {
        if (focusedWindow) {
          // @ts-ignore: https://github.com/electron/electron/issues/7832
          focusedWindow.toggleDevTools();
        }
      },
    },
  ];
  trackMenuItems('view', viewMenu);

  const template: MenuItemConstructorOptions[] = [
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
      submenu: viewMenu,
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
  ];

  if (process.platform === 'darwin') {
    const name = electron.app.name;
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
            electron.app.quit();
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

  trackMenuItems('root', template);

  return template;
}

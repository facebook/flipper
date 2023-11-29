/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {performance} from 'perf_hooks';
let launchStartTime: number | undefined = performance.now();

// eslint-disable-next-line no-restricted-imports
import {
  app,
  BrowserWindow,
  ipcMain,
  Notification,
  session,
  nativeTheme,
  shell,
} from 'electron';
import os from 'os';
import path from 'path';
import url from 'url';
import fs from 'fs';
import fixPath from 'fix-path';
import {exec} from 'child_process';
import setup, {Config, configPath} from './setup';
import isFB from './fb-stubs/isFB';
import yargs from 'yargs';
import {promisify} from 'util';
import process from 'process';
import {setupMenuBar} from './setupMenuBar';
import {ElectronIpcClientMain} from './electronIpcMain';

const VERSION: string = (global as any).__VERSION__;

const validThemes = ['light', 'dark', 'system'];

// Adds system PATH folders to process.env.PATH for MacOS production bundles.
fixPath();

// disable electron security warnings: https://github.com/electron/electron/blob/master/docs/tutorial/security.md#security-native-capabilities-and-your-responsibility
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

if (process.platform === 'darwin') {
  // If we are running on macOS and the app is called Flipper, we add a comment
  // with the old name, to make it findable via Spotlight using its old name.
  const APP_NAME = 'Flipper.app';
  const i = process.execPath.indexOf(`/${APP_NAME}/`);
  if (i > -1) {
    exec(
      `osascript -e 'on run {f, c}' -e 'tell app "Finder" to set comment of (POSIX file f as alias) to c' -e end "${process.execPath.substr(
        0,
        i,
      )}/${APP_NAME}" "sonar"`,
    );
  }
}

const argv = yargs
  .usage('$0 [args]')
  .options({
    updater: {
      default: true,
      describe: 'Toggle the built-in update mechanism.',
      type: 'boolean',
    },
    launcher: {
      default: true,
      describe: 'Toggle delegating to the update launcher on startup.',
      type: 'boolean',
    },
    'launcher-msg': {
      describe:
        '[Internal] Used to provide a user message from the launcher to the user.',
      type: 'string',
    },
    'open-dev-tools': {
      describe: 'Open Dev Tools window on startup.',
      default: false,
      type: 'boolean',
    },
    'disable-gpu': {
      describe:
        'Disable hardware acceleration. Corresponds to FLIPPER_DISABLE_GPU=1.',
      default: false,
      type: 'boolean',
    },
  })
  .version(VERSION)
  .help()
  .parse(process.argv.slice(1));

if (isFB && process.env.FLIPPER_FB === undefined) {
  process.env.FLIPPER_FB = 'true';
}

if (argv['disable-gpu'] || process.env.FLIPPER_DISABLE_GPU === '1') {
  console.warn('Hardware acceleration disabled');
  app.disableHardwareAcceleration();
}

// possible reference to main app window
let win: BrowserWindow;
let appReady = false;
let deeplinkURL: string | undefined;
let filePath: string | undefined;

// check if we already have an instance of this app open
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (win) {
      if (win.isMinimized()) {
        win.restore();
      }
      win.focus();
    }
  });

  // Create myWindow, load the rest of the app, etc...
  app.on('ready', () => {});
}

const openFileIfAny = () => {
  if (!filePath || !win) {
    return;
  }
  fs.readFile(filePath, {encoding: 'utf-8'}, (_err, data) => {
    win.webContents.send('open-flipper-file', filePath, data);
    filePath = undefined;
  });
};

const openURLIfAny = () => {
  if (!deeplinkURL || !win) {
    return;
  }
  win.webContents.send('flipper-protocol-handler', deeplinkURL);
  deeplinkURL = undefined;
};

// quit app once all windows are closed
app.on('window-all-closed', () => {
  appReady = false;
  app.quit();
});

app.on('will-finish-launching', () => {
  // Protocol handler for osx
  app.on('open-url', function (event, url) {
    event.preventDefault();
    deeplinkURL = url;
    openURLIfAny();
  });
  app.on('open-file', (event, path) => {
    // When flipper app is running, and someone double clicks the import file,
    // component and store is already mounted and the windows object will exist.
    // In that case, the file can be immediately opened.
    event.preventDefault();
    filePath = path;
    openFileIfAny();
  });
});

app.on('ready', async () => {
  const config = await setup(argv);
  processConfig(config);

  appReady = true;

  app.commandLine.appendSwitch('scroll-bounce');
  configureSession();
  createWindow(config);

  // if in development install the react devtools extension
  if (process.env.NODE_ENV === 'development') {
    const {
      default: installExtension,
      REACT_DEVELOPER_TOOLS,
    } = require('electron-devtools-installer');
    // if set, try to download a newever version of the dev tools
    const forceDownload = process.env.FLIPPER_UPDATE_DEV_TOOLS === 'true';
    if (forceDownload) {
      console.log('Force updating DevTools');
    }
    // React
    // Fix for extension loading (see D27685981)
    // Work around per https://github.com/electron/electron/issues/23662#issuecomment-787420799
    const reactDevToolsPath = `${os.homedir()}/Library/Application Support/Electron/extensions/${
      REACT_DEVELOPER_TOOLS.id
    }`;
    if (await promisify(fs.exists)(reactDevToolsPath)) {
      console.log('Loading React devtools from disk ' + reactDevToolsPath);
      try {
        await session.defaultSession.loadExtension(
          reactDevToolsPath,
          // @ts-ignore only supported (and needed) in Electron 12
          {allowFileAccess: true},
        );
      } catch (e) {
        console.error('Failed to load React devtools from disk: ', e);
      }
    } else {
      try {
        await installExtension(REACT_DEVELOPER_TOOLS.id, {
          loadExtensionOptions: {allowFileAccess: true, forceDownload},
        });
      } catch (e) {
        console.error('Failed to install React devtools extension', e);
      }
    }
  }
});

app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() === 'webview') {
    contents.on('new-window', async (event, url) => {
      // Disable creating of native Electron windows when requested from web views.
      // This can happen e.g. when user clicks to a link with target="__blank" on a page loaded in a web view,
      // or if some javascript code in a web view executes window.open.
      // Instead of the default implementation, we redirect such URLs to the operating system which handles them automatically:
      // using default browser for http/https links, using default mail client for "mailto" links etc.
      event.preventDefault();
      await shell.openExternal(url);
    });
  }
});

function configureSession() {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    {
      urls: ['*://*/*'],
    },
    (details, callback) => {
      // setting sec-fetch-site to always be 'none' so Flipper requests are not blocked by SecFetch policies
      details.requestHeaders['Sec-Fetch-Site'] = 'none';
      details.requestHeaders['Sec-Fetch-Mode'] = 'navigate';
      // setting Origin to always be 'localhost' to avoid issues when dev version and release version behaves differently.
      details.requestHeaders.origin = 'http://localhost:3000';
      details.requestHeaders.referer = 'http://localhost:3000/index.dev.html';
      callback({cancel: false, requestHeaders: details.requestHeaders});
    },
  );
}

ipcMain.on('storeRehydrated', (_event) => {
  openFileIfAny();
  openURLIfAny();
});

ipcMain.on('getLaunchTime', (event) => {
  if (launchStartTime) {
    event.sender.send('getLaunchTime', launchStartTime);
    // set launchTime to null to only report it once, to prevents reporting wrong
    // launch times for example after reloading the renderer process
    launchStartTime = undefined;
  }
});

ipcMain.on('setTheme', (_e, mode: 'light' | 'dark' | 'system') => {
  if (validThemes.includes(mode)) {
    nativeTheme.themeSource = mode;
  } else {
    console.warn('Received invalid theme: ' + mode);
  }
});

ipcMain.on(
  'sendNotification',
  (e, {payload, pluginNotification, closeAfter}) => {
    // notifications can only be sent when app is ready
    if (appReady) {
      const n = new Notification(payload);

      // Forwarding notification events to renderer process
      // https://electronjs.org/docs/api/notification#instance-events
      ['show', 'click', 'close', 'reply', 'action'].forEach((eventName) => {
        // TODO: refactor this to make typescript happy
        // @ts-ignore
        n.on(eventName, (event, ...args) => {
          e.sender.send(
            'notificationEvent',
            eventName,
            pluginNotification,
            ...args,
          );
        });
      });
      n.show();

      if (closeAfter) {
        setTimeout(() => {
          n.close();
        }, closeAfter);
      }
    }
  },
);

// Define custom protocol handler. Deep linking works on packaged versions of the application!
app.setAsDefaultProtocolClient('flipper');

// webSecurity is already disabled in BrowserWindow. However, it seems there is
// a bug in Electron 9 https://github.com/electron/electron/issues/23664. There
// is workaround suggested in the issue
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');

function createWindow(config: Config) {
  win = new BrowserWindow({
    show: false,
    title: 'Flipper',
    width: config.lastWindowPosition?.width || 1400,
    height: config.lastWindowPosition?.height || 1000,
    minWidth: 800,
    minHeight: 600,
    center: true,
    // The app icon is defined in package.json by default.
    // When building Linux zip, it must be defined here or else it won't work.
    icon:
      os.platform() === 'linux'
        ? path.join(__dirname, 'icons/app_64x64.png')
        : undefined,
    webPreferences: {
      backgroundThrottling: false,
      webSecurity: false,
      scrollBounce: true,
      experimentalFeatures: true,
      nodeIntegration: true,
      webviewTag: true,
      contextIsolation: false,
    },
  });
  win.once('ready-to-show', () => {
    win.show();
    if (argv['open-dev-tools'] || process.env.FLIPPER_OPEN_DEV_TOOLS) {
      win.webContents.openDevTools();
    }
  });
  win.once('close', () => {
    win.webContents.send('trackUsage', 'exit');
    if (process.env.NODE_ENV === 'development') {
      // Removes as a default protocol for debug builds. Because even when the
      // production application is installed, and one tries to deeplink through
      // browser, it still looks for the debug one and tries to open electron
      app.removeAsDefaultProtocolClient('flipper');
    }
    const [x, y] = win.getPosition();
    const [width, height] = win.getSize();
    // save window position and size

    fs.writeFile(
      configPath,
      JSON.stringify({
        ...config,
        darkMode: nativeTheme.themeSource,
        lastWindowPosition: {
          x,
          y,
          width,
          height,
        },
      }),
      (err) => {
        if (err) {
          console.error('Error while saving window position/size', err);
        }
      },
    );
  });
  if (
    config.lastWindowPosition &&
    config.lastWindowPosition.x &&
    config.lastWindowPosition.y
  ) {
    win.setPosition(config.lastWindowPosition.x, config.lastWindowPosition.y);
  }
  const entryUrl =
    process.env.ELECTRON_URL ||
    url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true,
    });
  win.loadURL(entryUrl);

  const electronIpcClient = new ElectronIpcClientMain(win);
  setupMenuBar(electronIpcClient);
}

function processConfig(config: Config) {
  process.env.CONFIG = JSON.stringify(config);
  nativeTheme.themeSource = validThemes.includes(config.darkMode)
    ? config.darkMode
    : 'light';
}

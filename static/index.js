/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const [s, ns] = process.hrtime();
let launchStartTime = s * 1e3 + ns / 1e6;

const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const {exec} = require('child_process');
const compilePlugins = require('./compilePlugins.js');
const os = require('os');
// disable electron security warnings: https://github.com/electron/electron/blob/master/docs/tutorial/security.md#security-native-capabilities-and-your-responsibility
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

if (!process.env.ANDROID_HOME) {
  process.env.ANDROID_HOME = '/opt/android_sdk';
}

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

// ensure .flipper folder and config exist
const sonarDir = path.join(os.homedir(), '.sonar');
const flipperDir = path.join(os.homedir(), '.flipper');
if (fs.existsSync(flipperDir)) {
  // nothing to do
} else if (fs.existsSync(sonarDir)) {
  // move .sonar to .flipper
  fs.renameSync(sonarDir, flipperDir);
} else {
  fs.mkdirSync(flipperDir);
}

const configPath = path.join(flipperDir, 'config.json');
let config = {pluginPaths: [], disabledPlugins: [], lastWindowPosition: {}};

try {
  config = {
    ...config,
    ...JSON.parse(fs.readFileSync(configPath)),
  };
} catch (e) {
  fs.writeFileSync(configPath, JSON.stringify(config));
}

const pluginPaths = config.pluginPaths
  .concat(
    path.join(__dirname, '..', 'src', 'plugins'),
    path.join(__dirname, '..', 'src', 'fb', 'plugins'),
  )
  .map(p => p.replace(/^~/, os.homedir()))
  .filter(fs.existsSync);

process.env.CONFIG = JSON.stringify({
  ...config,
  pluginPaths,
});

// possible reference to main app window
let win;
let appReady = false;
let pluginsCompiled = false;
let deeplinkURL = null;

// tracking
setInterval(() => {
  if (win && win.isFocused()) {
    win.webContents.send('trackUsage');
  }
}, 60 * 1000);

compilePlugins(
  () => {
    if (win) {
      win.reload();
    }
  },
  pluginPaths,
  path.join(flipperDir, 'plugins'),
).then(dynamicPlugins => {
  process.env.PLUGINS = JSON.stringify(dynamicPlugins);
  pluginsCompiled = true;
  tryCreateWindow();
});

// check if we already have an instance of this app open
const isSecondInstance = app.makeSingleInstance(
  (commandLine, workingDirectory) => {
    // someone tried to run a second instance, we should focus our window
    if (win) {
      if (win.isMinimized()) {
        win.restore();
      }

      win.focus();
    }
  },
);

// if this is a second instance then quit the app to prevent collisions
if (isSecondInstance) {
  app.quit();
}

// quit app once all windows are closed
app.on('window-all-closed', () => {
  appReady = false;
  app.quit();
});

app.on('will-finish-launching', () => {
  // Protocol handler for osx
  app.on('open-url', function(event, url) {
    event.preventDefault();
    deeplinkURL = url;
    if (win) {
      win.webContents.send('flipper-deeplink', deeplinkURL);
    }
  });
});

app.on('ready', function() {
  appReady = true;
  app.commandLine.appendSwitch('scroll-bounce');
  tryCreateWindow();
  // if in development install the react devtools extension
  if (process.env.NODE_ENV === 'development') {
    const {
      default: installExtension,
      REACT_DEVELOPER_TOOLS,
      REDUX_DEVTOOLS,
    } = require('electron-devtools-installer');
    installExtension(REACT_DEVELOPER_TOOLS.id);
    installExtension(REDUX_DEVTOOLS.id);
  }
});

ipcMain.on('componentDidMount', event => {
  if (deeplinkURL) {
    win.webContents.send('flipper-deeplink-preferred-plugin', deeplinkURL);
    deeplinkURL = null;
  }
});

ipcMain.on('getLaunchTime', event => {
  if (launchStartTime) {
    event.sender.send('getLaunchTime', launchStartTime);
    // set launchTime to null to only report it once, to prevents reporting wrong
    // launch times for example after reloading the renderer process
    launchStartTime = null;
  }
});
// Define custom protocol handler. Deep linking works on packaged versions of the application!
app.setAsDefaultProtocolClient('flipper');

function tryCreateWindow() {
  if (appReady && pluginsCompiled) {
    win = new BrowserWindow({
      show: false,
      title: 'Flipper',
      width: config.lastWindowPosition.width || 1400,
      height: config.lastWindowPosition.height || 1000,
      minWidth: 800,
      minHeight: 600,
      center: true,
      backgroundThrottling: false,
      titleBarStyle: 'hiddenInset',
      vibrancy: 'sidebar',
      webPreferences: {
        webSecurity: false,
        scrollBounce: true,
        experimentalFeatures: true,
      },
    });
    win.once('ready-to-show', () => win.show());
    win.once('close', ({sender}) => {
      if (process.env.NODE_ENV === 'development') {
        // Removes as a default protocol for debug builds. Because even when the
        // production application is installed, and one tries to deeplink through
        // browser, it still looks for the debug one and tries to open electron
        app.removeAsDefaultProtocolClient('flipper');
      }
      const [x, y] = sender.getPosition();
      const [width, height] = sender.getSize();
      // save window position and size
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          ...config,
          lastWindowPosition: {
            x,
            y,
            width,
            height,
          },
        }),
      );
    });
    if (config.lastWindowPosition.x && config.lastWindowPosition.y) {
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
  }
}

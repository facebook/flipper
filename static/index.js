/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
const {app, BrowserWindow} = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const compilePlugins = require('./compilePlugins.js');
const os = require('os');

if (!process.env.ANDROID_HOME) {
  process.env.ANDROID_HOME = '/opt/android_sdk';
}

// ensure .sonar folder and config exist
const sonarDir = path.join(os.homedir(), '.sonar');
if (!fs.existsSync(sonarDir)) {
  fs.mkdirSync(sonarDir);
}

const configPath = path.join(sonarDir, 'config.json');
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
  path.join(require('os').homedir(), '.sonar', 'plugins'),
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
function tryCreateWindow() {
  if (appReady && pluginsCompiled) {
    win = new BrowserWindow({
      show: false,
      title: 'Sonar',
      width: config.lastWindowPosition.width || 1400,
      height: config.lastWindowPosition.height || 1000,
      minWidth: 800,
      minHeight: 600,
      center: true,
      fullscreenable: false,
      backgroundThrottling: false,
      titleBarStyle: 'hiddenInset',
      webPreferences: {
        webSecurity: false,
        scrollBounce: true,
        experimentalFeatures: true,
      },
    });
    win.once('ready-to-show', () => win.show());
    win.once('close', ({sender}) => {
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

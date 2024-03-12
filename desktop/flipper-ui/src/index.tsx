/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import './global';
import {
  getLogger,
  getStringFromErrorLike,
  isProduction,
  setLoggerInstance,
  wrapRequire,
} from 'flipper-common';
import {init as initLogger} from './fb-stubs/Logger';
import {createFlipperServer, FlipperServerState} from 'flipper-server-client';
import {setFlipperServer, setFlipperServerConfig} from './flipperServer';
import {startFlipperDesktop} from './startFlipperDesktop';

declare module globalThis {
  let require: any;
}

// Whenever we bundle plugins, we assume that they are going to share some modules - React, React-DOM, ant design and etc.
// It allows us to decrease the bundle size and not to create separate React roots for every plugin
// To tell a plugin that a module is going to be provided externally, we add the module to the list of externals (see https://esbuild.github.io/api/#external).
// As a result, esbuild does not bundle hte contents of the module. Instead, it wraps the module name with `require(...)`.
// `require` does not exist ion the browser environment, so we substitute it here to feed the plugin our global module.
globalThis.require = wrapRequire((module: string) => {
  throw new Error(
    `Dynamic require is not supported in browser envs. Tried to require: ${module}`,
  );
});

const loadingContainer = document.getElementById('loading');
if (loadingContainer) {
  loadingContainer.innerText = 'Loading...';
}

let cachedFile: {name: string; data: string} | undefined;
let cachedDeepLinkURL: string | undefined;

const logger = initLogger();

async function start() {
  /**
   * The following is used to ensure only one instance of Flipper is running at a time.
   * The event will not be fired for the current tab.
   */
  window.addEventListener('storage', function (event) {
    if (event.key === 'flipper-kill-window') {
      window.close();
    }
  });

  setLoggerInstance(logger);

  const params = new URL(location.href).searchParams;

  if (!isProduction()) {
    let token = params.get('token');
    if (!token) {
      token = window.flipperConfig.authToken;
    }

    const socket = new WebSocket(`ws://${location.host}?token=${token}`);
    socket.addEventListener('message', ({data: dataRaw}) => {
      const message = JSON.parse(dataRaw.toString());

      if (typeof message.event === 'string') {
        switch (message.event) {
          case 'hasErrors': {
            console.warn('Error message received', message.payload);
            break;
          }
          case 'plugins-source-updated': {
            window.postMessage({
              type: 'plugins-source-updated',
              data: message.payload,
            });
            break;
          }
        }
      }
    });
  }

  const tokenProvider = () => {
    const providerParams = new URL(location.href).searchParams;
    let token = providerParams.get('token');
    if (!token) {
      console.info('[flipper-client][ui-browser] Get token from HTML instead');
      token = window.flipperConfig.authToken;
      if (!token || token === 'FLIPPER_AUTH_TOKEN_REPLACE_ME') {
        console.warn(
          '[flipper-client][ui-browser] Failed to get token from HTML',
          token,
        );
        window.flipperShowMessage?.({
          detail: `[flipper-client][ui-browser] Failed to get token from HTML: ${token}`,
        });
      }
    }

    getLogger().info(
      '[flipper-client][ui-browser] Token is available: ',
      token?.length != 0,
      token?.length === 460,
    );

    return token;
  };

  const openPlugin = params.get('open-plugin');
  if (openPlugin) {
    function removePrefix(input: string, prefix: string): string {
      const regex = new RegExp(`^${prefix}+`);
      return input.replace(regex, '');
    }

    const url = new URL(openPlugin);
    const maybeParams = removePrefix(url.pathname, '/');
    const params = new URLSearchParams(maybeParams);

    const deeplinkURL = new URL('flipper://open-plugin');
    deeplinkURL.search = params.toString();

    cachedDeepLinkURL = deeplinkURL.toString();
  }

  getLogger().info('[flipper-client][ui-browser] Create WS client');

  let lastStateChangeMS = performance.now();
  const flipperServer = await createFlipperServer(
    location.hostname,
    parseInt(location.port, 10),
    tokenProvider,
    (state: FlipperServerState) => {
      const timestamp = performance.now();
      getLogger().track('usage', 'browser-server-state-changed', {
        state,
        timeElapsedMS: timestamp - lastStateChangeMS,
      });
      lastStateChangeMS = timestamp;
      switch (state) {
        case FlipperServerState.CONNECTING:
          getLogger().info('[flipper-client] Connecting to server');
          window.flipperShowMessage?.({title: 'Connecting to server...'});
          break;
        case FlipperServerState.CONNECTED:
          getLogger().info(
            '[flipper-client] Connection established with server',
          );
          window.flipperHideMessage?.();
          break;
        case FlipperServerState.DISCONNECTED:
          getLogger().info('[flipper-client] Disconnected from server');
          window.flipperShowMessage?.({title: 'Waiting for server...'});
          break;
      }
    },
  );

  getLogger().info('[flipper-client][ui-browser] WS client connected');

  flipperServer.on('server-log', (logEntry) => {
    getLogger()[logEntry.type](
      `[${logEntry.namespace}] (${new Date(
        logEntry.time,
      ).toLocaleTimeString()}): ${logEntry.msg}`,
    );
  });

  getLogger().info(
    '[flipper-client][ui-browser] Waiting for server connection',
  );
  await flipperServer.connect();
  getLogger().info(
    '[flipper-client][ui-browser] Connected to server, get configuration',
  );
  const flipperServerConfig = await flipperServer.exec('get-config');

  getLogger().info(
    '[flipper-client][ui-browser] Configuration obtained, initialise render host',
  );

  setFlipperServer(flipperServer);
  setFlipperServerConfig(flipperServerConfig);

  initializePWA();

  startFlipperDesktop(flipperServer);
  window.flipperHideMessage?.();

  /**
   * At this stage, the current client has established a connection with the server.
   * So, it is safe to 'set' into local storage so that other clients close.
   */
  localStorage.setItem('flipper-kill-window', Date.now().toString());

  getLogger().info('[flipper-client][ui-browser] UI initialised');
  logger.track('success-rate', 'flipper-ui-browser-started', {value: 1});
}

start().catch((e) => {
  getLogger().error('Failed to start flipper-ui-browser', e);
  logger.track('success-rate', 'flipper-ui-browser-started', {
    value: 0,
    error: getStringFromErrorLike(e),
    pwa: window.matchMedia('(display-mode: standalone)').matches,
  });
  window.flipperShowMessage?.({detail: `Failed to start UI with error: ${e}`});
});

async function initializePWA() {
  getLogger().info('[PWA] Initialization');

  let rehydrated = false;
  const openFileIfAny = () => {
    if (!cachedFile || !rehydrated) {
      return;
    }
    window.dispatchEvent(
      new CustomEvent('open-flipper-file', {
        detail: [cachedFile.name, cachedFile.data],
      }),
    );
    cachedFile = undefined;
  };

  const openURLIfAny = () => {
    if (!cachedDeepLinkURL || !rehydrated) {
      return;
    }
    window.dispatchEvent(
      new CustomEvent('flipper-protocol-handler', {
        detail: [cachedDeepLinkURL],
      }),
    );
    cachedDeepLinkURL = undefined;
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(() => {
        getLogger().info('[PWA] Service Worker has been registered');
      })
      .catch((e) => {
        getLogger().error('[PWA] failed to register Service Worker', e);
      });
  }

  if ('launchQueue' in window) {
    getLogger().debug('[PWA] File Handling API is supported');

    // @ts-ignore
    window.launchQueue.setConsumer(async (launchParams) => {
      if (!launchParams || !launchParams.files) {
        return;
      }
      getLogger().debug('[PWA] Attempt to to open a file');
      for (const file of launchParams.files) {
        const blob = await file.getFile();
        blob.handle = file;

        const data = await blob.text();
        const name = file.name;

        cachedFile = {name, data};

        openFileIfAny();
      }
    });
  } else {
    console.warn('[PWA] File Handling API is not supported');
  }

  getLogger().debug('[PWA] Add before install prompt listener');
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt.
    e.preventDefault();
    // Stash the event so it can be triggered later.
    // @ts-ignore
    global.PWAppInstallationEvent = e;
    getLogger().info('[PWA] Installation event has been captured');
  });

  window.addEventListener('storeRehydrated', () => {
    getLogger().info('[PWA] Store is rehydrated');
    rehydrated = true;
    openFileIfAny();
    openURLIfAny();
  });
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getLogger, Logger, setLoggerInstance} from 'flipper-common';
import {initializeRenderHost} from './initializeRenderHost';
import {createFlipperServer, FlipperServerState} from 'flipper-server-client';

const loadingContainer = document.getElementById('loading');
if (loadingContainer) {
  loadingContainer.innerText = 'Loading...';
}

async function start() {
  // @ts-ignore
  electronRequire = function (path: string) {
    console.error(
      `[decapitate] Tried to electronRequire ${path}, this module is not available in the browser and will be stubbed`,
    );
    return {
      default: {},
    };
  };

  const logger = createDelegatedLogger();
  setLoggerInstance(logger);

  const params = new URL(location.href).searchParams;
  let token = params.get('token');
  if (!token) {
    const manifestResponse = await fetch('manifest.json');
    const manifest = await manifestResponse.json();
    token = manifest.token;
  }

  const searchParams = new URLSearchParams({token: token ?? ''});

  const flipperServer = await createFlipperServer(
    location.hostname,
    parseInt(location.port, 10),
    searchParams,
    (state: FlipperServerState) => {
      switch (state) {
        case FlipperServerState.CONNECTING:
          window.flipperShowError?.('Connecting to server...');
          break;
        case FlipperServerState.CONNECTED:
          window?.flipperHideError?.();
          break;
        case FlipperServerState.DISCONNECTED:
          window?.flipperShowError?.('Lost connection to server');
          break;
      }
    },
  );

  flipperServer.on('server-log', (logEntry) => {
    console[logEntry.type](
      `[${logEntry.namespace}] (${new Date(
        logEntry.time,
      ).toLocaleTimeString()}): ${logEntry.msg}`,
    );
  });

  await flipperServer.connect();
  const flipperServerConfig = await flipperServer.exec('get-config');

  initializeRenderHost(flipperServer, flipperServerConfig);

  // By turning this in a require, we force the JS that the body of this module (init) has completed (initializeElectron),
  // before starting the rest of the Flipper process.
  // This prevent issues where the render host is referred at module initialisation level,
  // but not set yet, which might happen when using normal imports.
  // TODO: remove
  window.flipperShowError?.('Connected to Flipper Server successfully');
  // @ts-ignore
  // eslint-disable-next-line import/no-commonjs
  require('flipper-ui-core').startFlipperDesktop(flipperServer);
  window.flipperHideError?.();
}

start().catch((e) => {
  console.error('Failed to start flipper-ui-browser', e);
  window.flipperShowError?.('Failed to start flipper-ui-browser: ' + e);
});

// getLogger() is not  yet created when the electron app starts.
// we can't create it here yet, as the real logger is wired up to
// the redux store and the rest of the world. So we create a delegating logger
// that uses a simple implementation until the real one comes available
function createDelegatedLogger(): Logger {
  const naiveLogger: Logger = {
    track(...args: [any, any, any?, any?]) {
      console.warn('(skipper track)', args);
    },
    trackTimeSince(...args: [any, any, any?]) {
      console.warn('(skipped trackTimeSince)', args);
    },
    debug(...args: any[]) {
      console.debug(...args);
    },
    error(...args: any[]) {
      console.error(...args);
      console.warn('(skipped error reporting)');
    },
    warn(...args: any[]) {
      console.warn(...args);
      console.warn('(skipped error reporting)');
    },
    info(...args: any[]) {
      console.info(...args);
    },
  };
  // will be overwrittingen later
  setLoggerInstance(naiveLogger);

  return {
    track() {
      // noop
    },
    trackTimeSince() {
      // noop
    },
    debug(...args: any[]) {
      getLogger().debug(...args);
    },
    error(...args: any[]) {
      getLogger().error(...args);
    },
    warn(...args: any[]) {
      getLogger().warn(...args);
    },
    info(...args: any[]) {
      getLogger().info(...args);
    },
  };
}

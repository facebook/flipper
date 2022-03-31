/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  createControlledPromise,
  FlipperServerForServerAddOn,
  ServerAddOn,
} from 'flipper-plugin';
import path from 'path';
import {WebSocketServer, WebSocket} from 'ws';
import {rollup} from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import {Events, Methods} from './contract';

const DEV_TOOLS_PORT = 8097; // hardcoded in RN

async function findGlobalDevTools(
  flipperServer: FlipperServerForServerAddOn,
): Promise<string | undefined> {
  try {
    const {stdout: basePath} = await flipperServer.exec(
      'node-api-exec',
      'npm root -g',
    );
    console.debug(
      'flipper-plugin-react-devtools.findGlobalDevTools -> npm root',
      basePath,
    );
    const devToolsPath = path.join(
      basePath.trim(),
      'react-devtools-inline',
      'frontend.js',
    );
    await flipperServer.exec('node-api-fs-stat', devToolsPath);
    return devToolsPath;
  } catch (error) {
    console.warn('Failed to find globally installed React DevTools: ' + error);
    return undefined;
  }
}

const serverAddOn: ServerAddOn<Events, Methods> = async (
  connection,
  {flipperServer},
) => {
  console.debug('flipper-plugin-react-devtools.serverAddOn -> starting');

  const startServer = async () => {
    console.debug('flipper-plugin-react-devtools.serverAddOn -> startServer');

    const wss = new WebSocketServer({port: DEV_TOOLS_PORT});

    const startedPromise = createControlledPromise<void>();
    wss.on('listening', () => startedPromise.resolve());
    wss.on('error', (err) => {
      if (startedPromise.state === 'pending') {
        startedPromise.reject(err);
        return;
      }

      console.error('flipper-plugin-react-devtools.serverAddOn -> error', err);
    });

    await startedPromise.promise;

    console.debug(
      'flipper-plugin-react-devtools.serverAddOn -> started server',
    );

    wss.on('connection', (ws) => {
      connection.send('connected');
      console.debug(
        'flipper-plugin-react-devtools.serverAddOn -> connected a client',
      );

      ws.on('message', (data) => {
        connection.send('message', JSON.parse(data.toString()));
        console.debug(
          'flipper-plugin-react-devtools.serverAddOn -> client sent a message',
          data.toString(),
        );
      });

      ws.on('error', (err) => {
        console.error(
          'flipper-plugin-react-devtools.serverAddOn -> client error',
          err,
        );
      });

      ws.on('close', () => {
        connection.send('disconnected');
        console.debug(
          'flipper-plugin-react-devtools.serverAddOn -> client left',
        );
      });
    });

    connection.receive('message', (data) => {
      console.debug(
        'flipper-plugin-react-devtools.serverAddOn -> desktop sent a message',
        data,
      );
      wss!.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(data));
        }
      });
    });

    return wss;
  };

  const wss = await startServer();

  connection.receive('globalDevTools', async () => {
    const globalDevToolsPath = await findGlobalDevTools(flipperServer);
    if (!globalDevToolsPath) {
      console.info(
        'flipper-plugin-react-devtools.serverAddOn -> not found global React DevTools',
      );
      return;
    }
    console.info(
      'flipper-plugin-react-devtools.serverAddOn -> found global React DevTools: ',
      globalDevToolsPath,
    );

    const bundle = await rollup({
      input: globalDevToolsPath,
      plugins: [resolve(), commonjs()],
      external: ['react', 'react-is', 'react-dom/client', 'react-dom'],
    });

    try {
      const {output} = await bundle.generate({
        format: 'iife',
        globals: {
          react: 'global.React',
          'react-is': 'global.ReactIs',
          'react-dom/client': 'global.ReactDOMClient',
          'react-dom': 'global.ReactDOM',
        },
      });
      return output[0].code;
    } finally {
      await bundle.close();
    }
  });

  return async () => {
    console.debug('flipper-plugin-react-devtools.serverAddOn -> stopping');
    if (wss) {
      console.debug(
        'flipper-plugin-react-devtools.serverAddOn -> stopping wss',
      );
      await new Promise<void>((resolve, reject) =>
        wss!.close((err) => (err ? reject(err) : resolve())),
      );
      console.debug('flipper-plugin-react-devtools.serverAddOn -> stopped wss');
    }
  };
};

export default serverAddOn;

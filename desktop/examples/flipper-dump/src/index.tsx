/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs';
import os from 'os';
import yargs from 'yargs';
import {
  FlipperServerImpl,
  getEnvironmentInfo,
  loadLauncherSettings,
  loadProcessConfig,
  loadSettings,
  sessionId,
} from 'flipper-server';
import {
  ClientDescription,
  Logger,
  DeviceDescription,
  setLoggerInstance,
  parseEnvironmentVariables,
} from 'flipper-common';
import path from 'path';
import {stdout} from 'process';

// eslint-disable-next-line
const packageJson = JSON.parse(fs.readFileSync('../package.json', 'utf-8'));

// eslint-disable-next-line node/no-sync
const argv = yargs
  .usage('$0 [args]')
  .options({
    device: {
      describe: 'The device name or serial/udid to listen to',
      type: 'string',
      demandOption: true,
    },
    client: {
      describe: 'The application name to listen to',
      type: 'string',
      demandOption: true,
    },
    plugin: {
      describe: 'Plugin id to listen to',
      type: 'string',
      demandOption: true,
    },
    settingsString: {
      describe: `override the existing defaults settings of flipper (settings.json file) e.g "{"androidHome":"/usr/local/bin","enableAndroid":true}"`,
      type: 'string',
      default: '',
    },
    launcherSettings: {
      describe:
        'Open Flipper with the configuration stored in .config folder for the launcher',
      type: 'boolean',
      default: true,
    },
    // TODO: support filtering events
    // TODO: support verbose mode
    // TODO: support post processing messages
  })
  .version(packageJson.version)
  .help()
  // .strict()
  .parseSync(process.argv.slice(1));

async function start(deviceQuery: string, appName: string, pluginId: string) {
  return new Promise(async (_resolve, reject) => {
    const staticPath = path.resolve(__dirname, '..', '..', 'static');
    let device: DeviceDescription | undefined;
    let deviceResolver: () => void;
    const devicePromise: Promise<void> = new Promise((resolve) => {
      deviceResolver = resolve;
    });
    let client: ClientDescription | undefined;

    const logger = createLogger();
    setLoggerInstance(logger);
    // avoid logging to STDOUT!
    console.log = console.error;
    console.debug = () => {};
    console.info = console.error;

    const environmentInfo = await getEnvironmentInfo(staticPath, false);
    // TODO: initialise FB user manager to be able to do certificate exchange

    const [launcherSettings, settings] = await Promise.all([
      loadLauncherSettings(argv.launcherSettings),
      loadSettings(argv.settingsString),
    ]);
    const server = new FlipperServerImpl(
      {
        sessionId,
        environmentInfo,
        env: parseEnvironmentVariables(process.env),
        gatekeepers: {},
        paths: {
          staticPath,
          tempPath: os.tmpdir(),
          appPath: `/dev/null`,
          homePath: `/dev/null`,
          execPath: process.execPath,
          desktopPath: `/dev/null`,
        },
        launcherSettings,
        processConfig: loadProcessConfig(process.env),
        settings,
        validWebSocketOrigins: [],
      },
      logger,
    );

    logger.info(
      `Waiting for device '${deviceQuery}' client '${appName}' plugin '${pluginId}' ...`,
    );

    server.on('notification', ({type, title, description}) => {
      if (type === 'error') {
        reject(new Error(`${title}: ${description}`));
      }
    });

    server.on('server-error', reject);
    server.on('server-state', ({state, error}) => {
      if (state === 'error') {
        reject(error);
      }
    });

    server.on('device-connected', (deviceInfo) => {
      logger.info(
        `Detected device [${deviceInfo.os}] ${deviceInfo.title} ${deviceInfo.serial}`,
      );
      if (deviceInfo.serial == deviceQuery) {
        logger.info(`Device matched on device serial ${deviceQuery}`);
        device = deviceInfo;
        deviceResolver();
      } else if (deviceInfo.title === deviceQuery) {
        logger.info(`Device matched on device title ${deviceQuery}`);
        device = deviceInfo;
        deviceResolver();
      }
    });

    server.on('device-disconnected', (deviceInfo) => {
      if (device && deviceInfo.serial === device.serial) {
        reject(new Error(`Device disconnected: ${deviceInfo.serial}`));
      }
    });

    server.on('client-setup', (client) => {
      logger.info(
        `Connection attempt: ${client.appName} on ${client.deviceName}`,
      );
    });

    server.on(
      'client-connected',
      async (clientDescription: ClientDescription) => {
        // device matching is promisified, as we clients can arrive before device is detected
        await devicePromise;
        if (clientDescription.query.app === appName) {
          // TODO: Fix this the next time the file is edited.
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          if (clientDescription.query.device_id === device!.serial) {
            logger.info(`Client matched: ${clientDescription.id}`);
            client = clientDescription;
            try {
              // fetch plugins
              const response = await server.exec(
                'client-request-response',
                client.id,
                {
                  method: 'getPlugins',
                },
              );
              logger.info(JSON.stringify(response));
              if (response.error) {
                reject(response.error);
                return;
              }
              const plugins: string[] = (response.success as any).plugins;
              logger.info(`Detected plugins ${plugins.join(',')}`);
              if (!plugins.includes(pluginId)) {
                // TODO: what if it only registers later?
                throw new Error(
                  `Plugin ${pluginId} was not registered on client ${client.id}`,
                );
              }
              logger.info(`Starting plugin ${pluginId}`);
              const response2 = await server.exec(
                'client-request-response',
                client.id,
                {
                  method: 'init',
                  params: {plugin: pluginId},
                },
              );
              if (response2.error) {
                reject(response2.error);
              }
              logger.info('Plugin initialised');
            } catch (e) {
              reject(e);
            }
          }
        }
      },
    );

    server.on('client-disconnected', ({id}) => {
      if (id === client?.id) {
        // TODO: maybe we need a flag to signal that this might be undesired?
        logger.info('Target application disconnected, exiting...');
        process.exit(0);
      }
    });

    server.on('client-message', ({id, message}) => {
      if (id === client?.id) {
        const parsed = JSON.parse(message);
        if (parsed.method === 'execute') {
          if (parsed.params.api === pluginId) {
            // TODO: customizable format
            stdout.write(
              `\n\n\n[${parsed.params.method}]\n${JSON.stringify(
                parsed.params.params,
                null,
                2,
              )}\n`,
            );
          }
        } else {
          logger.warn('Dropping message ', message);
        }
      }
    });

    server
      .connect()
      .then(() => {
        logger.info(
          'Flipper server started and accepting device / client connections',
        );
      })
      .catch(reject);
  });
}

function createLogger(): Logger {
  return {
    track() {
      // no-op
    },
    trackTimeSince() {
      // no-op
    },
    debug() {
      // TODO: support this with a --verbose flag
    },
    error(...args: any[]) {
      console.error(...args);
    },
    warn(...args: any[]) {
      console.warn(...args);
    },
    info(...args: any[]) {
      // we want to redirect info level logging to STDERR! So that STDOUT is used merely for plugin output
      console.error(...args);
    },
  };
}

// TODO: Fix this the next time the file is edited.
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
start(argv.device!, argv.client!, argv.plugin!).catch((e) => {
  // eslint-disable-next-line
  console.error(e);
  process.exit(1);
});

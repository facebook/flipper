/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperServerConfig} from 'flipper-common';
import {
  parseEnvironmentVariableAsNumber,
  parseFlipperPorts,
} from './utils/environmentVariables';

let currentConfig: FlipperServerConfig | undefined = undefined;

// just an ugly utility to not need a reference to FlipperServerImpl itself everywhere
export function getFlipperServerConfig(): FlipperServerConfig {
  if (!currentConfig) {
    throw new Error('FlipperServerConfig has not been set');
  }
  return currentConfig;
}

export function setFlipperServerConfig(
  config: FlipperServerConfig | undefined,
) {
  currentConfig = config;
}

type ServerPorts = {
  insecure: number;
  secure: number;
};

export function getServerPortsConfig(): {
  serverPorts: ServerPorts;
  altServerPorts: ServerPorts;
  browserPort: number;
} {
  let portOverrides: ServerPorts | undefined;
  if (process.env.FLIPPER_PORTS) {
    portOverrides = parseFlipperPorts(process.env.FLIPPER_PORTS);
    if (!portOverrides) {
      console.error(
        `Ignoring malformed FLIPPER_PORTS env variable:
          "${process.env.FLIPPER_PORTS || ''}".
          Example expected format: "1111,2222".`,
      );
    }
  }

  let portAltOverrides: ServerPorts | undefined;
  if (process.env.FLIPPER_ALT_PORTS) {
    portAltOverrides = parseFlipperPorts(process.env.FLIPPER_ALT_PORTS);
    if (!portAltOverrides) {
      console.error(
        `Ignoring malformed FLIPPER_ALT_PORTS env variable:
          "${process.env.FLIPPER_ALT_PORTS || ''}".
          Example expected format: "1111,2222".`,
      );
    }
  }

  let portBrowserOverride: number | undefined;
  if (process.env.FLIPPER_BROWSER_PORT) {
    portBrowserOverride = parseEnvironmentVariableAsNumber(
      'FLIPPER_BROWSER_PORT',
    );
    if (!portBrowserOverride) {
      console.error(
        `Ignoring malformed FLIPPER_BROWSER_PORT env variable:
          "${process.env.FLIPPER_BROWSER_PORT || ''}".
          Example expected format: "1111".`,
      );
    }
  }

  return {
    serverPorts: portOverrides ?? {
      insecure: 8089,
      secure: 8088,
    },
    altServerPorts: portAltOverrides ?? {
      insecure: 9089,
      secure: 9088,
    },
    browserPort: portBrowserOverride ?? 8333,
  };
}

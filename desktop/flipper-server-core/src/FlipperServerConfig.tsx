/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {isTest} from 'flipper-common';
import {parseFlipperPorts} from './utils/environmentVariables';

export interface FlipperServerConfig {
  enableAndroid: boolean;
  androidHome: string;
  enableIOS: boolean;
  idbPath: string;
  enablePhysicalIOS: boolean;
  validWebSocketOrigins: string[];
  staticPath: string;
  tmpPath: string;
}

// defaultConfig should be used for testing only, and disables by default all features
const testConfig: FlipperServerConfig = {
  androidHome: '',
  enableAndroid: false,
  enableIOS: false,
  enablePhysicalIOS: false,
  idbPath: '',
  validWebSocketOrigins: [],
  staticPath: '/static/',
  tmpPath: '/temp/',
};

let currentConfig: FlipperServerConfig | undefined = undefined;

export function getFlipperServerConfig(): FlipperServerConfig {
  if (!currentConfig) {
    if (isTest()) return testConfig;
    throw new Error('FlipperServerConfig has not been set');
  }
  return currentConfig;
}

export function setFlipperServerConfig(config: FlipperServerConfig) {
  currentConfig = config;
}

type ServerPorts = {
  insecure: number;
  secure: number;
};

export function getServerPortsConfig(): {
  serverPorts: ServerPorts;
  altServerPorts: ServerPorts;
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

  return {
    serverPorts: portOverrides ?? {
      insecure: 8089,
      secure: 8088,
    },
    altServerPorts: portAltOverrides ?? {
      insecure: 9089,
      secure: 9088,
    },
  };
}

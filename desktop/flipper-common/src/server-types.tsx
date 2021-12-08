/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperDoctor} from './doctor';
import {
  BundledPluginDetails,
  DeviceSpec,
  DeviceType,
  DownloadablePluginDetails,
  InstalledPluginDetails,
  OS as PluginOS,
  UpdatablePluginDetails,
} from './PluginDetails';
import {
  EnvironmentInfo,
  LauncherSettings,
  ProcessConfig,
  Settings,
} from './settings';

// In the future, this file would deserve it's own package, as it doesn't really relate to plugins.
// Since flipper-plugin however is currently shared among server, client and defines a lot of base types, leaving it here for now.

export type FlipperServerState =
  | 'pending'
  | 'starting'
  | 'started'
  | 'error'
  | 'closed';

export type DeviceOS = PluginOS;

export type DeviceDescription = {
  readonly os: DeviceOS;
  readonly title: string;
  readonly deviceType: DeviceType;
  readonly serial: string;
  readonly icon?: string;
  // Android specific information
  readonly specs?: DeviceSpec[];
  readonly abiList?: string[];
  readonly sdkVersion?: string;
};

export type DeviceLogEntry = {
  readonly date: Date;
  readonly type: DeviceLogLevel;
  readonly message: string;
  readonly pid: number;
  readonly tid: number;
  readonly app?: string;
  readonly tag: string;
};

export type DeviceLogLevel =
  | 'unknown'
  | 'verbose'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal';

export type UninitializedClient = {
  os: string;
  deviceName: string;
  appName: string;
};

export type ClientQuery = {
  readonly app: string;
  readonly os: DeviceOS;
  readonly device: string;
  readonly device_id: string;
  readonly sdk_version?: number;
};

export type ClientDescription = {
  readonly id: string;
  readonly query: ClientQuery;
};

export type ClientErrorType = {
  message: string;
  stacktrace: string;
  name: string;
};

export type ClientResponseType =
  | {
      success: object | string | number | boolean | null;
      error?: never;
      length: number;
    }
  | {success?: never; error: ClientErrorType; length: number};

export type FlipperServerEvents = {
  'server-state': {state: FlipperServerState; error?: Error};
  'server-error': any;
  notification: {
    type: 'error';
    title: string;
    description: string;
  };
  'device-connected': DeviceDescription;
  'device-disconnected': DeviceDescription;
  'device-log': {
    serial: string;
    entry: DeviceLogEntry;
  };
  'client-setup': UninitializedClient;
  'client-connected': ClientDescription;
  'client-disconnected': {id: string};
  'client-message': {
    id: string;
    message: string;
  };
};

export type IOSDeviceParams = {
  udid: string;
  type: DeviceType;
  name: string;
  deviceTypeIdentifier?: string;
  state?: string;
};

export type FlipperServerCommands = {
  'get-config': () => Promise<FlipperServerConfig>;
  'get-changelog': () => Promise<string>;
  'device-list': () => Promise<DeviceDescription[]>;
  'device-start-logging': (serial: string) => Promise<void>;
  'device-stop-logging': (serial: string) => Promise<void>;
  'device-supports-screenshot': (serial: string) => Promise<boolean>;
  'device-supports-screencapture': (serial: string) => Promise<boolean>;
  'device-take-screenshot': (serial: string) => Promise<string>; // base64 encoded buffer
  'device-start-screencapture': (
    serial: string,
    destination: string,
  ) => Promise<void>;
  'device-stop-screencapture': (serial: string) => Promise<string>; // file path
  'device-shell-exec': (serial: string, command: string) => Promise<string>;
  'device-forward-port': (
    serial: string,
    local: string,
    remote: string,
  ) => Promise<boolean>;
  'device-clear-logs': (serial: string) => Promise<void>;
  'device-navigate': (serial: string, location: string) => Promise<void>;
  'metro-command': (serial: string, command: string) => Promise<void>;
  'client-list': () => Promise<ClientDescription[]>;
  'client-request': (clientId: string, payload: any) => Promise<void>;
  'client-request-response': (
    clientId: string,
    payload: any,
  ) => Promise<ClientResponseType>;
  'android-get-emulators': () => Promise<string[]>;
  'android-launch-emulator': (name: string, coldboot: boolean) => Promise<void>;
  'ios-get-simulators': (bootedOnly: boolean) => Promise<IOSDeviceParams[]>;
  'ios-launch-simulator': (udid: string) => Promise<void>;
  'persist-settings': (settings: Settings) => Promise<void>;
  'persist-launcher-settings': (settings: LauncherSettings) => Promise<void>;
  'keychain-write': (service: string, token: string) => Promise<void>;
  'keychain-read': (service: string) => Promise<string>;
  'keychain-unset': (service: string) => Promise<void>;
  'plugins-load-dynamic-plugins': () => Promise<InstalledPluginDetails[]>;
  'plugins-get-bundled-plugins': () => Promise<BundledPluginDetails[]>;
  'plugins-get-installed-plugins': () => Promise<InstalledPluginDetails[]>;
  'plugins-get-updatable-plugins': (
    query: string | undefined,
  ) => Promise<UpdatablePluginDetails[]>;
  'plugin-start-download': (
    plugin: DownloadablePluginDetails,
  ) => Promise<InstalledPluginDetails>;
  'plugin-source': (path: string) => Promise<string>;
  'plugins-install-from-npm': (name: string) => Promise<InstalledPluginDetails>;
  'plugins-install-from-file': (
    path: string,
  ) => Promise<InstalledPluginDetails>;
  'plugins-remove-plugins': (names: string[]) => Promise<void>;
  'doctor-get-healthchecks': (
    settings: FlipperDoctor.HealthcheckSettings,
  ) => Promise<FlipperDoctor.Healthchecks>;
  'doctor-run-healthcheck': (
    settings: FlipperDoctor.HealthcheckSettings,
    category: keyof FlipperDoctor.Healthchecks,
    name: string,
  ) => Promise<FlipperDoctor.HealthcheckResult>;
  'open-file': (path: string) => Promise<void>;
  'intern-graph-post': (
    endpoint: string,
    formFields: Record<string, any>,
    fileFields: Record<string, GraphFileUpload>,
    options: {
      timeout?: number;
      internGraphUrl?: string;
    },
  ) => Promise<GraphResponse>;
  'intern-graph-get': (
    endpoint: string,
    params: Record<string, any>,
    options: {
      timeout?: number;
      internGraphUrl?: string;
    },
  ) => Promise<GraphResponse>;
  'intern-upload-scribe-logs': (
    messages: {category: string; message: string}[],
  ) => Promise<void>;
};

export type GraphResponse = {
  status: number;
  data: any;
  headers: Record<string, any>;
};

export type GraphFileUpload = {
  path?: string;
  contents?: string;
  filename?: string;
  contentType?: string;
};

/**
 * White listed environment variables that can be used in Flipper UI / plugins
 */
const environmentVariables = {
  NODE_ENV: 1,
  DEV_SERVER_URL: 1,
  CONFIG: 1,
  FLIPPER_ENABLED_PLUGINS: 1,
  FB_ONDEMAND: 1,
  FLIPPER_INTERNGRAPH_URL: 1,
  JEST_WORKER_ID: 1,
  FLIPPER_DOCS_BASE_URL: 1,
  FLIPPER_NO_PLUGIN_AUTO_UPDATE: 1,
  FLIPPER_NO_PLUGIN_MARKETPLACE: 1,
  HOME: 1,
  METRO_PORT_ENV_VAR: 1,
  FLIPPER_PLUGIN_AUTO_UPDATE_POLLING_INTERVAL: 1,
} as const;
export type ENVIRONMENT_VARIABLES = keyof typeof environmentVariables;

/**
 * Grab all environment variables from a process.env object, without leaking variables which usage isn't declared in ENVIRONMENT_VARIABLES
 */
export function parseEnvironmentVariables(
  baseEnv: any,
): Partial<Record<ENVIRONMENT_VARIABLES, string>> {
  const result: any = {};
  Object.keys(environmentVariables).forEach((k) => {
    result[k] = baseEnv[k];
  });

  return result;
}

type ENVIRONMENT_PATHS =
  | 'appPath'
  | 'homePath'
  | 'execPath'
  | 'staticPath'
  | 'tempPath'
  | 'desktopPath';

export type FlipperServerConfig = {
  gatekeepers: Record<string, boolean>;
  env: Partial<Record<ENVIRONMENT_VARIABLES, string>>;
  paths: Record<ENVIRONMENT_PATHS, string>;
  settings: Settings;
  launcherSettings: LauncherSettings;
  processConfig: ProcessConfig;
  validWebSocketOrigins: string[];
  environmentInfo: EnvironmentInfo;
};

export interface FlipperServer {
  connect(): Promise<void>;
  on<Event extends keyof FlipperServerEvents>(
    event: Event,
    callback: (payload: FlipperServerEvents[Event]) => void,
  ): void;
  off<Event extends keyof FlipperServerEvents>(
    event: Event,
    callback: (payload: FlipperServerEvents[Event]) => void,
  ): void;
  exec<Event extends keyof FlipperServerCommands>(
    event: Event,
    ...args: Parameters<FlipperServerCommands[Event]>
  ): ReturnType<FlipperServerCommands[Event]>;
  close(): void;
}

// From xplat/js/metro/packages/metro/src/lib/reporting.js
export type MetroBundleDetails = {
  entryFile: string;
  platform?: string;
  dev: boolean;
  minify: boolean;
  bundleType: string;
};

// From xplat/js/metro/packages/metro/src/lib/reporting.js
export type MetroGlobalCacheDisabledReason =
  | 'too_many_errors'
  | 'too_many_misses';

/**
 * A tagged union of all the actions that may happen and we may want to
 * report to the tool user.
 *
 * Based on xplat/js/metro/packages/metro/src/lib/TerminalReporter.js
 */
export type MetroReportableEvent =
  | {
      port: number;
      projectRoots: ReadonlyArray<string>;
      type: 'initialize_started';
    }
  | {type: 'initialize_done'}
  | {
      type: 'initialize_failed';
      port: number;
      error: Error;
    }
  | {
      buildID: string;
      type: 'bundle_build_done';
    }
  | {
      buildID: string;
      type: 'bundle_build_failed';
    }
  | {
      buildID: string;
      bundleDetails: MetroBundleDetails;
      type: 'bundle_build_started';
    }
  | {
      error: Error;
      type: 'bundling_error';
    }
  | {type: 'dep_graph_loading'}
  | {type: 'dep_graph_loaded'}
  | {
      buildID: string;
      type: 'bundle_transform_progressed';
      transformedFileCount: number;
      totalFileCount: number;
    }
  | {
      type: 'global_cache_error';
      error: Error;
    }
  | {
      type: 'global_cache_disabled';
      reason: MetroGlobalCacheDisabledReason;
    }
  | {type: 'transform_cache_reset'}
  | {
      type: 'worker_stdout_chunk';
      chunk: string;
    }
  | {
      type: 'worker_stderr_chunk';
      chunk: string;
    }
  | {
      type: 'hmr_client_error';
      error: Error;
    }
  | {
      type: 'client_log';
      level:
        | 'trace'
        | 'info'
        | 'warn'
        | 'log'
        | 'group'
        | 'groupCollapsed'
        | 'groupEnd'
        | 'debug';
      data: Array<any>;
    };

// TODO: Complete message list
export type SignCertificateMessage = {
  method: 'signCertificate';
  csr: string;
  destination: string;
  medium: number | undefined;
};
export type GetPluginsMessage = {
  id: number;
  method: 'getPlugins';
};
export type GetBackgroundPluginsMessage = {
  id: number;
  method: 'getBackgroundPlugins';
};
export type ExecuteMessage = {
  method: 'execute';
  params: {
    method: string;
    api: string;
    params?: unknown;
  };
};
export type ResponseMessage =
  | {
      id: number;
      success: object | string | number | boolean | null;
      error?: never;
    }
  | {
      id: number;
      success?: never;
      error: ClientErrorType;
    };

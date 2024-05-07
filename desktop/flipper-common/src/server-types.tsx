/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperDoctor} from './doctor';
import {
  DeviceSpec,
  DownloadablePluginDetails,
  InstalledPluginDetails,
  MarketplacePluginDetails,
  UpdatablePluginDetails,
} from './PluginDetails';
import {ServerAddOnStartDetails} from './ServerAddOn';
import {
  EnvironmentInfo,
  LauncherSettings,
  ProcessConfig,
  Settings,
} from './settings';
import {LoggerInfo} from './utils/Logger';

// In the future, this file would deserve it's own package, as it doesn't really relate to plugins.
// Since flipper-plugin however is currently shared among server, client and defines a lot of base types, leaving it here for now.

export type FlipperServerType = 'embedded' | 'external';
export type CertificateExchangeMedium = 'FS_ACCESS' | 'WWW' | 'NONE';

export type FlipperServerState =
  | 'pending'
  | 'starting'
  | 'started'
  | 'error'
  | 'closed';

export type DeviceOS = OS;

export type DeviceDescription = {
  readonly os: DeviceOS;
  readonly title: string;
  readonly deviceType: DeviceType;
  readonly serial: string;
  readonly icon?: string;
  readonly features: {
    screenshotAvailable: boolean;
    screenCaptureAvailable: boolean;
  };
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

export type ConnectionRecordEntry = {
  time: Date;
  type: 'warning' | 'info' | 'error';
  os: DeviceOS;
  device: string;
  app: string;
  message: string;
  medium: CertificateExchangeMedium;
};

export type CommandRecordEntry = ConnectionRecordEntry & {
  cmd: string;
  description: string;
  success: boolean;
  stdout?: string;
  stderr?: string;
  troubleshoot?: string;
};

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
  medium: CertificateExchangeMedium;
  rsocket?: boolean;
};

export type SecureClientQuery = ClientQuery & {
  csr?: string | undefined;
  csr_path?: string | undefined;
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
  'server-state': {state: FlipperServerState; error?: string};
  'server-error': any;
  notification: {
    type: 'success' | 'info' | 'error' | 'warning';
    title: string;
    description: string;
  };
  'device-connected': DeviceDescription;
  'device-disconnected': DeviceDescription;
  'device-removed': DeviceDescription;
  'device-log': {
    serial: string;
    entry: DeviceLogEntry;
  };
  'device-crash': {
    serial: string;
    crash: CrashLog;
  };
  'client-setup': UninitializedClient;
  'client-setup-secret-exchange': {
    client: UninitializedClient;
    secret: string;
  };
  'client-setup-error': {
    client: UninitializedClient;
    type: 'error' | 'warning';
    message: string;
  };
  'client-setup-step': {
    client: UninitializedClient;
    step: string;
  };
  'client-connected': ClientDescription;
  'client-disconnected': {id: string};
  'client-message': {
    id: string;
    message: string;
  };
  'connectivity-troubleshoot-cmd': CommandRecordEntry;
  'connectivity-troubleshoot-log': ConnectionRecordEntry[];
  'plugins-server-add-on-message': ExecuteMessage;
  'download-file-update': DownloadFileUpdate;
  'server-log': LoggerInfo;
  'browser-connection-created': {};
};

export type OS =
  | 'iOS'
  | 'Android'
  | 'Metro'
  | 'Windows'
  | 'MacOS'
  | 'Browser'
  | 'Linux';

export type DeviceType = 'physical' | 'emulator' | 'dummy';

export type DeviceTarget = {
  udid: string;
  type: DeviceType;
  name: string;
  osVersion?: string;
  state?: string;
};

// Serializable subset of StatsBase from fs.d.ts
export interface FSStatsLike {
  isFile: boolean;
  isDirectory: boolean;
  isSymbolicLink: boolean;
  mode: number;
  uid: number;
  gid: number;
  size: number;
  atimeMs: number;
  mtimeMs: number;
  ctimeMs: number;
  birthtimeMs: number;
}

export interface DeviceDebugFile {
  path: string;
  data: string;
}
export interface DeviceDebugCommand {
  command: string;
  result: string;
}
export interface DeviceDebugData {
  serial: string;
  appId: string;
  data: (DeviceDebugFile | DeviceDebugCommand)[];
}

export interface PluginSource {
  js: string;
  css?: string;
}
export type FlipperServerCommands = {
  'get-server-state': () => Promise<{
    state: FlipperServerState;
    error?: string;
  }>;
  'node-api-fs-access': (path: string, mode?: number) => Promise<void>;
  'node-api-fs-pathExists': (path: string, mode?: number) => Promise<boolean>;
  'node-api-fs-unlink': (path: string) => Promise<void>;
  'node-api-fs-mkdir': (
    path: string,
    options?: {recursive?: boolean} & MkdirOptions,
  ) => Promise<string | void>;
  'node-api-fs-rm': (path: string, options?: RmOptions) => Promise<void>;
  'node-api-fs-copyFile': (
    src: string,
    dest: string,
    flags?: number,
  ) => Promise<void>;
  'node-api-fs-stat': (path: string) => Promise<FSStatsLike>;
  'node-api-fs-readlink': (path: string) => Promise<string>;
  'node-api-fs-readfile': (
    path: string,
    options?: {encoding?: BufferEncoding},
  ) => Promise<string>;
  'node-api-fs-readfile-binary': (
    path: string,
  ) => Promise<string /* base64 encoded */>;
  'node-api-fs-writefile': (
    path: string,
    contents: string,
    options?: {encoding?: BufferEncoding},
  ) => Promise<void>;
  'node-api-fs-writefile-binary': (
    path: string,
    base64contents: string,
  ) => Promise<void>;
  /**
   * @throws ExecError
   */
  'node-api-exec': (
    command: string,
    options?: ExecOptions & {encoding?: BufferEncoding},
  ) => Promise<ExecOut<string>>;
  'download-file-start': (
    url: string,
    dest: string,
    options?: DownloadFileStartOptions,
  ) => Promise<DownloadFileStartResponse>;
  'get-config': () => Promise<FlipperServerConfig>;
  'get-changelog': () => Promise<string>;
  'device-list': () => Promise<DeviceDescription[]>;
  'device-find': (
    deviceSerial: string,
  ) => Promise<DeviceDescription | undefined>;
  'device-take-screenshot': (serial: string) => Promise<string>; // base64 encoded buffer
  'device-start-screencapture': (
    serial: string,
    destination: string,
  ) => Promise<void>;
  'device-stop-screencapture': (serial: string) => Promise<string>; // file path
  'device-shell-exec': (serial: string, command: string) => Promise<string>;
  'device-install-app': (
    serial: string,
    appBundlePath: string,
  ) => Promise<void>;
  'device-open-app': (serial: string, name: string) => Promise<void>;
  'device-forward-port': (
    serial: string,
    local: string,
    remote: string,
  ) => Promise<boolean>;
  'device-clear-logs': (serial: string) => Promise<void>;
  'device-navigate': (serial: string, location: string) => Promise<void>;
  'fetch-debug-data': () => Promise<DeviceDebugData[]>;
  'metro-command': (serial: string, command: string) => Promise<void>;
  'client-list': () => Promise<ClientDescription[]>;
  'client-find': (clientId: string) => Promise<ClientDescription | undefined>;
  'client-request': (clientId: string, payload: any) => Promise<void>;
  'client-request-response': (
    clientId: string,
    payload: any,
  ) => Promise<ClientResponseType>;
  'android-get-emulators': () => Promise<string[]>;
  'android-launch-emulator': (name: string, coldboot: boolean) => Promise<void>;
  'android-adb-kill': () => Promise<void>;
  'ios-get-simulators': (bootedOnly: boolean) => Promise<DeviceTarget[]>;
  'ios-launch-simulator': (udid: string) => Promise<void>;
  'ios-launch-app': (udid: string, appName: string) => Promise<void>;
  'ios-idb-kill': () => Promise<void>;
  'persist-settings': (settings: Settings) => Promise<void>;
  'persist-launcher-settings': (settings: LauncherSettings) => Promise<void>;
  'keychain-write': (service: string, token: string) => Promise<void>;
  'keychain-read': (service: string) => Promise<string>;
  'keychain-unset': (service: string) => Promise<void>;
  'plugins-load-dynamic-plugins': () => Promise<InstalledPluginDetails[]>;
  'plugins-load-marketplace-plugins': () => Promise<MarketplacePluginDetails[]>;
  'plugins-get-installed-plugins': () => Promise<InstalledPluginDetails[]>;
  'plugins-get-updatable-plugins': (
    query: string | undefined,
  ) => Promise<UpdatablePluginDetails[]>;
  'plugin-start-download': (
    plugin: DownloadablePluginDetails,
  ) => Promise<InstalledPluginDetails>;
  'plugin-source': (path: string) => Promise<PluginSource>;
  'plugins-install-from-marketplace': (
    name: string,
  ) => Promise<InstalledPluginDetails>;
  'plugins-install-from-npm': (name: string) => Promise<InstalledPluginDetails>;
  'plugins-install-from-content': (
    contents: string,
  ) => Promise<InstalledPluginDetails>;
  'plugins-remove-plugins': (names: string[]) => Promise<void>;
  'plugins-server-add-on-start': (
    pluginName: string,
    details: ServerAddOnStartDetails,
    owner: string,
  ) => Promise<void>;
  'plugins-server-add-on-stop': (
    pluginName: string,
    owner: string,
  ) => Promise<void>;
  'plugins-server-add-on-request-response': (
    payload: ExecuteMessage,
  ) => Promise<ClientResponseType>;
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
      headers?: Record<string, string | number | boolean>;
      vpnMode?: 'vpn' | 'vpnless';
    },
  ) => Promise<GraphResponse>;
  'intern-graph-get': (
    endpoint: string,
    params: Record<string, any>,
    options: {
      timeout?: number;
      internGraphUrl?: string;
      headers?: Record<string, string | number | boolean>;
      vpnMode?: 'vpn' | 'vpnless';
    },
  ) => Promise<GraphResponse>;
  'intern-upload-scribe-logs': (
    messages: {category: string; message: string}[],
  ) => Promise<void>;
  'intern-cloud-upload': (path: string) => Promise<string>;
  shutdown: () => Promise<void>;
  restart: () => Promise<void>;
  'is-logged-in': () => Promise<boolean>;
  'environment-info': () => Promise<EnvironmentInfo>;
  'move-pwa': () => Promise<void>;
  'fetch-new-version': (version: string) => Promise<void>;
};

export type GraphResponse = {
  status: number;
  data: any;
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
  SKIP_TOKEN_VERIFICATION: 1,
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

export interface ExecOptions {
  maxBuffer?: number;
  timeout?: number;
  cwd?: string;
}

export interface ExecError {
  message: string;
  stdout: string;
  stderr: string;
  stack?: string;
  cmd?: string;
  killed?: boolean;
  code?: number;
}

export interface ExecOut<StdOutErrType> {
  stdout: StdOutErrType;
  stderr: StdOutErrType;
}
export type BufferEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'base64url'
  | 'latin1'
  | 'binary'
  | 'hex';

export interface MkdirOptions {
  mode?: string | number;
}

export interface RmOptions {
  maxRetries?: number;
}

export interface DownloadFileStartOptions {
  method?: 'GET' | 'POST';
  timeout?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
  overwrite?: boolean;
}

export type DownloadFileUpdate = {
  id: string;
  downloaded: number;
  /**
   * Set to 0 if unknown
   */
  totalSize: number;
} & (
  | {
      status: 'downloading';
    }
  | {
      status: 'success';
    }
  | {status: 'error'; message: string; stack?: string}
);

export interface DownloadFileStartResponse {
  /**
   * Download ID
   */
  id: string;
  /**
   * Response status
   */
  status: number;
  /**
   * Response status text
   */
  statusText: string;
  /**
   * Response headers
   */
  headers: Record<string, string>;
  /**
   * Size of the file, being downloaded, in bytes. Inferred from the "Content-Length" header. Set to 0 if unknown.
   */
  totalSize: number;
}

export type FlipperServerConfig = {
  gatekeepers: Record<string, boolean>;
  env: Partial<Record<ENVIRONMENT_VARIABLES, string>>;
  paths: Record<ENVIRONMENT_PATHS, string>;
  settings: Settings;
  launcherSettings: LauncherSettings;
  processConfig: ProcessConfig;
  validWebSocketOrigins: string[];
  environmentInfo: EnvironmentInfo;
  type?: FlipperServerType;
  sessionId: string;
};

export interface FlipperServerExecOptions {
  timeout: number;
}
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
    options: FlipperServerExecOptions,
    event: Event,
    ...args: Parameters<FlipperServerCommands[Event]>
  ): ReturnType<FlipperServerCommands[Event]>;
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
  timestamp?: number;
  logs?: string[];
};

export type SignCertificateAckMessage = {
  method: 'signCertificateAck';
  isError: boolean;
  medium: number | undefined;
  hasRequiredFiles: boolean;
  config: any;
  logs?: string[];
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

// TODO: Could we merge it with ClientResponseType?
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

export type CrashLog = {
  callstack?: string;
  reason: string;
  name: string;
  date?: number;
};

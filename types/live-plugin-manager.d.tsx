/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export declare class PluginManager {
  constructor(options?: Partial<LivePluginManager.PluginManagerOptions>);
  install(
    name: string,
    version?: string,
  ): Promise<LivePluginManager.IPluginInfo>;
  installFromPath(
    location: string,
    options?: {
      force: boolean;
    },
  ): Promise<LivePluginManager.IPluginInfo>;

  readonly options: LivePluginManager.PluginManagerOptions;
}

declare namespace LivePluginManager {
  interface IPluginInfo {
    readonly mainFile: string;
    readonly location: string;
    readonly name: string;
    readonly version: string;
    readonly dependencies: {[name: string]: string};
  }

  interface PluginSandbox {
    env?: NodeJS.ProcessEnv;
    global?: NodeJS.Global;
  }

  export interface NpmRegistryAuthToken {
    token: string;
  }

  export interface NpmRegistryAuthBasic {
    username: string;
    password: string;
  }

  interface NpmRegistryConfig {
    auth?: NpmRegistryAuthToken | NpmRegistryAuthBasic;
    userAgent?: string;
  }

  export interface GithubAuthUserToken {
    type: 'token';
    token: string;
  }

  export interface GithubAuthBasic {
    type: 'basic';
    username: string;
    password: string;
  }

  export type GithubAuth = GithubAuthUserToken | GithubAuthBasic;

  interface PluginManagerOptions {
    cwd: string;
    pluginsPath: string;
    sandbox: PluginSandbox;
    npmRegistryUrl: string;
    npmRegistryConfig: NpmRegistryConfig;
    npmInstallMode: 'useCache' | 'noCache';
    requireCoreModules: boolean;
    hostRequire?: NodeRequire;
    ignoredDependencies: Array<string | RegExp>;
    staticDependencies: {[key: string]: any};
    githubAuthentication?: GithubAuth;
    lockWait: number;
    lockStale: number;
  }
}

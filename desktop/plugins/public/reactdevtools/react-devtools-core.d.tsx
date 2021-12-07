/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

type ServerOptions = {
  key?: string;
  cert?: string;
};

type LoggerOptions = {
  surface?: string;
};

type StatusTypes = 'server-connected' | 'devtools-connected' | 'error';
type StatusListener = (message: string, status: StatusTypes) => void;

declare module 'react-devtools-core/standalone' {
  interface DevTools {
    setContentDOMNode(node: HTMLElement): this;
    startServer(
      port?: number,
      host?: string,
      httpsOptions?: ServerOptions,
      loggerOptions?: LoggerOptions,
    ): {close: () => void};
    setStatusListener(listener: StatusListener): this;
  }
  const DevTools: DevTools;
  export default DevTools;
}

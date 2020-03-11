/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

declare module 'react-devtools-core/standalone' {
  interface DevTools {
    setContentDOMNode(node: HTMLElement): this;
    startServer(port: number): this;
    setStatusListener(listener: (message: string) => void): this;
  }
  const DevTools: DevTools;
  export default DevTools;
}

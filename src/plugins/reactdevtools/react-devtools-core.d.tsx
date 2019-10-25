/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

declare module 'react-devtools-core/standalone' {
  interface DevTools {
    setContentDOMNode(node: HTMLElement): DevTools;
    startServer(port: number): DevTools;
  }
  const DevTools: DevTools;
  export default DevTools;
}

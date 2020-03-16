/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

module.exports = {
  remote: {
    process: {
      env: {},
    },
    app: {
      getPath: (path: string) => `/${path}`,
      getAppPath: process.cwd,
      getVersion: () => '0.9.99',
      relaunch: () => {},
      exit: () => {},
    },
    getCurrentWindow: () => ({isFocused: () => true}),
  },
  ipcRenderer: {},
};

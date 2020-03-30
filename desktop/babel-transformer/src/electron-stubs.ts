/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {parseExpression} from '@babel/parser';
import {CallExpression} from '@babel/types';
import {NodePath} from '@babel/traverse';

const electronStubs = parseExpression(
  `{
    remote: {
      process: {
        env: {},
      },
      getCurrentWindow: function() {
        return {
          isFocused: function() {return true;},
          on: function() {return true;}
        };
      },
      app: {
        getVersion: function() {return global.__VERSION__ || '1';},
        getName: function() {return '';},
        getAppPath: function() {return process.cwd();}
      },
      shell: {
        openExternal: function() {}
      },
      Menu: {
        buildFromTemplate: function() {
          return {items: []}
        },
        setApplicationMenu: function() {}
      }
    },
    ipcRenderer: {
      on: function() {return true;}
    },
  }
  `,
);

module.exports = () => ({
  name: 'replace-electron-requires-with-stubs',
  visitor: {
    CallExpression(path: NodePath<CallExpression>) {
      const node = path.node;
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        node.arguments.length > 0 &&
        node.arguments[0].type === 'StringLiteral' &&
        node.arguments[0].value === 'electron'
      ) {
        path.replaceWith(electronStubs);
      }
    },
  },
});

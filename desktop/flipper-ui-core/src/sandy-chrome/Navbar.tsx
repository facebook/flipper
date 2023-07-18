/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Layout, theme} from 'flipper-plugin';
import React from 'react';

export function Navbar() {
  return (
    <Layout.Horizontal
      style={{
        width: '100%',
        height: 68,
        padding: `${theme.space.small}px ${theme.space.large}px`,
        alignItems: 'center',
        justifyContent: 'space-between',
        background: theme.backgroundDefault,
        borderBottom: `solid 1px ${theme.dividerColor}`,
      }}>
      <Layout.Horizontal style={{gap: 16}}>
        <button>show/hide sidebar</button>
        <button>device picker</button>
        <button>screenshot</button>
        <button>record video</button>
      </Layout.Horizontal>
      <Layout.Horizontal style={{gap: 16}}>
        <button>add plugins</button>
        <button>Alerts</button>
        <button>Doctor</button>
        <button>Help</button>
        <button>More</button>
      </Layout.Horizontal>
    </Layout.Horizontal>
  );
}

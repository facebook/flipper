/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Layout} from 'flipper-plugin';
import React from 'react';

export function Centered(props: {children: React.ReactNode}) {
  return (
    <Layout.Horizontal center grow>
      <Layout.Container center grow>
        {props.children}
      </Layout.Container>
    </Layout.Horizontal>
  );
}

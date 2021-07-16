/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Layout} from '../ui';
import React from 'react';
import {Tab, Tabs} from 'flipper-plugin';
import {ConsoleLogs} from './ConsoleLogs';
import {FlipperMessages} from './FlipperMessages';

export function FlipperDevTools() {
  return (
    <Layout.Container grow>
      <Tabs grow>
        <Tab tab="Console">
          <ConsoleLogs />
        </Tab>
        <Tab tab="Messages">
          <FlipperMessages />
        </Tab>
      </Tabs>
    </Layout.Container>
  );
}

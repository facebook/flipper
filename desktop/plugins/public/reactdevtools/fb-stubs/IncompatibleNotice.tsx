/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Layout, getFlipperLib} from 'flipper-plugin';
import React from 'react';
import {Button} from 'antd';

export const IncompatibleNotice = () => {
  return (
    <Layout.Container
      pad="medium"
      style={{maxWidth: 350, alignItems: 'center', margin: 'auto'}}>
      <h1 style={{fontSize: 20}}>Incompatibility notice</h1>
      <p>
        This plugin is not compatible with the in-browser Flipper distribution.
      </p>
      <p>
        Please, install our last Electron release v0.239.0 to use this plugin.
      </p>
      <div style={{display: 'inline-block', textAlign: 'center'}}>
        <Button
          type="primary"
          block
          onClick={() =>
            getFlipperLib().openLink(
              'https://github.com/facebook/flipper/releases/tag/v0.239.0',
            )
          }>
          Install
        </Button>
      </div>
    </Layout.Container>
  );
};

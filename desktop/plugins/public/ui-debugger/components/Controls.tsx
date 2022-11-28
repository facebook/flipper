/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */
import React from 'react';
import {plugin} from '../index';
import {Button, Input, Tooltip} from 'antd';
import {PauseCircleOutlined, PlayCircleOutlined} from '@ant-design/icons';
import {usePlugin, useValue, Layout} from 'flipper-plugin';

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export const Controls: React.FC = () => {
  const instance = usePlugin(plugin);
  const searchTerm = useValue(instance.uiState.searchTerm);
  const isPaused = useValue(instance.uiState.isPaused);
  return (
    <Layout.Horizontal pad="small" gap="small">
      <Input
        value={searchTerm}
        onChange={(e) => instance.uiState.searchTerm.set(e.target.value)}
      />
      <Button
        type="default"
        shape="circle"
        onClick={() => instance.setPlayPause(!instance.uiState.isPaused.get())}
        icon={
          <Tooltip
            title={isPaused ? 'Resume live updates' : 'Pause incoming updates'}>
            {isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
          </Tooltip>
        }></Button>
    </Layout.Horizontal>
  );
};

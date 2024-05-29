/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {WarningOutlined} from '@ant-design/icons';
import {Button} from 'antd';
import {Layout, theme} from 'flipper-plugin';
import {getStore} from 'flipper-ui/src/store';
import React, {useEffect, useState} from 'react';

const PluginQueueMemoryUsageScanInterval = 2500;

export function PluginMemoryWarning() {
  const [_, rerender] = useState(0);

  useEffect(() => {
    const handle = setInterval(() => {
      rerender((x) => x + 1);
    }, PluginQueueMemoryUsageScanInterval);

    return () => {
      clearInterval(handle);
    };
  }, []);

  const totalSizeMb = getQueuedMessagedConsumption();

  if (totalSizeMb < 50) {
    return null;
  }

  const color = totalSizeMb < 150 ? theme.warningColor : theme.errorColor;

  return (
    <Layout.Container pad="small">
      <Button
        style={{padding: 4}}
        type="ghost"
        icon={
          <WarningOutlined style={{color, fontSize: theme.fontSize.large}} />
        }>
        {totalSizeMb.toFixed(0)}Mb queued messages
      </Button>
    </Layout.Container>
  );
}

function getQueuedMessagedConsumption() {
  const messageQueues = getStore().getState().pluginMessageQueue;
  let totalSize = 0;
  for (const queue of Object.values(messageQueues)) {
    for (const message of queue) {
      totalSize += message.rawSize;
    }
  }

  const totalSizeMb = totalSize / 1000000;
  return totalSizeMb;
}

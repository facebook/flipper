/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useCallback, useEffect, useState} from 'react';
import {MetroReportableEvent} from 'flipper-common';
import {useStore} from '../utils/useStore';
import {Button as AntButton} from 'antd';
import {MenuOutlined, ReloadOutlined} from '@ant-design/icons';
import {theme} from 'flipper-plugin';
import BaseDevice from '../devices/BaseDevice';

export default function MetroButton() {
  const device = useStore((state) =>
    state.connections.devices.find(
      (device) => device.os === 'Metro' && device.connected.get(),
    ),
  ) as BaseDevice | undefined;

  const sendCommand = useCallback(
    (command: string) => {
      device?.sendMetroCommand(command);
    },
    [device],
  );
  const [progress, setProgress] = useState(1);
  const [_hasBuildError, setHasBuildError] = useState(false);

  useEffect(() => {
    if (!device) {
      return;
    }
    function metroEventListener(event: MetroReportableEvent) {
      if (event.type === 'bundle_build_started') {
        setHasBuildError(false);
        setProgress(0);
      } else if (event.type === 'bundle_build_failed') {
        setHasBuildError(true);
        setProgress(1);
      } else if (event.type === 'bundle_build_done') {
        setHasBuildError(false);
        setProgress(1);
      } else if (event.type === 'bundle_transform_progressed') {
        setProgress(event.transformedFileCount / event.totalFileCount);
      }
    }

    const handle = device.addLogListener((l) => {
      if (l.tag !== 'client_log') {
        try {
          metroEventListener(JSON.parse(l.message));
        } catch (e) {
          console.warn('Failed to parse metro message: ', l, e);
        }
      }
    });

    return () => {
      device.removeLogListener(handle);
    };
  }, [device]);

  if (!device) {
    return null;
  }

  return (
    <>
      <AntButton
        icon={<ReloadOutlined />}
        title="Reload React Native App"
        type="ghost"
        onClick={() => {
          sendCommand('reload');
        }}
        loading={progress < 1}
        style={{color: _hasBuildError ? theme.errorColor : undefined}}
      />
      <AntButton
        icon={<MenuOutlined />}
        title="Open the React Native Dev Menu on the device"
        type="ghost"
        onClick={() => {
          sendCommand('devMenu');
        }}
      />
    </>
  );
}

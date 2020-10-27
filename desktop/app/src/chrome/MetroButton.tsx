/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useCallback, useEffect, useState} from 'react';
import {Button, ButtonGroup, colors} from '../ui';
import MetroDevice, {MetroReportableEvent} from '../devices/MetroDevice';
import styled from '@emotion/styled';
import {useStore} from '../utils/useStore';
import {Button as AntButton} from 'antd';
import {MenuOutlined, ReloadOutlined} from '@ant-design/icons';

type LogEntry = {};

export type PersistedState = {
  logs: LogEntry[];
};

function ProgressBar({
  progress,
  width,
  color,
}: {
  progress: number;
  width: number;
  color: string;
}) {
  return (
    <ProgressBarContainer width={width} color={color}>
      <ProgressBarBar progress={progress} color={color} />
    </ProgressBarContainer>
  );
}

const ProgressBarContainer = styled.div<{width: number; color: string}>(
  ({width, color}) => ({
    border: `1px solid ${color}`,
    borderRadius: 4,
    height: 6,
    width: width,
  }),
);

const ProgressBarBar = styled.div<{progress: number; color: string}>(
  ({progress, color}) => ({
    background: color,
    width: `${Math.min(100, Math.round(progress * 100))}%`,
    height: 4,
  }),
);

export default function MetroButton({useSandy}: {useSandy?: boolean}) {
  const device = useStore((state) =>
    state.connections.devices.find(
      (device) => device.os === 'Metro' && !device.isArchived,
    ),
  ) as MetroDevice | undefined;

  const sendCommand = useCallback(
    (command: string) => {
      device?.sendCommand(command);
    },
    [device],
  );
  const [progress, setProgress] = useState(1);
  const [hasBuildError, setHasBuildError] = useState(false);

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
    device.metroEventEmitter.on('event', metroEventListener);
    return () => {
      device.metroEventEmitter.off('event', metroEventListener);
    };
  }, [device]);

  if (!device) {
    return null;
  }

  return useSandy ? (
    <>
      <AntButton
        icon={<ReloadOutlined />}
        title="Reload React Native App"
        type="ghost"
        onClick={() => {
          sendCommand('reload');
        }}
        loading={progress < 1}
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
  ) : (
    <ButtonGroup>
      <Button
        title="Reload React Native App"
        icon="arrows-circle"
        compact
        onClick={() => {
          sendCommand('reload');
        }}>
        {progress < 1 ? (
          <ProgressBar
            progress={100 * progress}
            color={hasBuildError ? colors.red : colors.cyan}
            width={20}
          />
        ) : null}
      </Button>
      <Button
        title="Open the React Native Dev Menu on the device"
        icon="navicon"
        compact
        onClick={() => {
          sendCommand('devMenu');
        }}
      />
    </ButtonGroup>
  );
}

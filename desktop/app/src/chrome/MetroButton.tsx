/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useCallback, useEffect, useState} from 'react';
import {
  Button,
  ButtonGroup,
  MetroDevice,
  connect,
  colors,
  styled,
} from 'flipper';
import {State} from '../reducers';
import {MetroReportableEvent} from '../devices/MetroDevice';

type LogEntry = {};

export type PersistedState = {
  logs: LogEntry[];
};

type Props = {
  device: MetroDevice;
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

function MetroButton({device}: Props) {
  const sendCommand = useCallback(
    (command: string) => {
      device.sendCommand(command);
    },
    [device],
  );
  const [progress, setProgress] = useState(1);
  const [hasBuildError, setHasBuildError] = useState(false);

  useEffect(() => {
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

  return (
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

export default connect<Props, {}, {}, State>(({connections: {devices}}) => ({
  device: devices.find(
    (device) => device.os === 'Metro' && !device.isArchived,
  ) as MetroDevice,
}))(MetroButton);

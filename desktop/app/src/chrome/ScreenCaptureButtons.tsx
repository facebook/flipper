/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button as AntButton, message} from 'antd';
import {Button, ButtonGroup} from '../ui';
import React, {useState, useEffect, useCallback} from 'react';
import path from 'path';
import open from 'open';
import {capture, CAPTURE_LOCATION, getFileName} from '../utils/screenshot';
import {CameraOutlined, VideoCameraOutlined} from '@ant-design/icons';
import {useStore} from '../utils/useStore';

export async function openFile(path: string | null) {
  if (!path) {
    return;
  }

  try {
    await open(path);
  } catch (e) {
    console.error(`Opening ${path} failed with error ${e}.`);
  }
}

export default function ScreenCaptureButtons({useSandy}: {useSandy?: boolean}) {
  const selectedDevice = useStore((state) => state.connections.selectedDevice);
  const [isTakingScreenshot, setIsTakingScreenshot] = useState(false);
  const [isRecordingAvailable, setIsRecordingAvailable] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    let cancelled = false;
    selectedDevice?.screenCaptureAvailable().then((result) => {
      if (!cancelled) {
        setIsRecordingAvailable(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedDevice]);

  const handleScreenshot = useCallback(() => {
    setIsTakingScreenshot(true);
    capture(selectedDevice!)
      .then(openFile)
      .catch((e) => {
        console.error('Taking screenshot failed:', e);
        message.error('Taking screenshot failed:' + e);
      })
      .finally(() => {
        setIsTakingScreenshot(false);
      });
  }, [selectedDevice]);
  const handleRecording = useCallback(() => {
    if (!selectedDevice) {
      return;
    }
    if (!isRecording) {
      setIsRecording(true);
      const videoPath = path.join(CAPTURE_LOCATION, getFileName('mp4'));
      selectedDevice.startScreenCapture(videoPath).catch((e) => {
        console.error('Failed to start recording', e);
        message.error('Failed to start recording' + e);
        setIsRecording(false);
      });
    } else {
      selectedDevice
        .stopScreenCapture()
        .then((path) => {
          path && openFile(path);
        })
        .catch((e) => {
          console.error('Failed to start recording', e);
          message.error('Failed to start recording' + e);
        })
        .finally(() => {
          setIsRecording(false);
        });
    }
  }, [selectedDevice, isRecording]);

  return useSandy ? (
    <>
      <AntButton
        icon={<CameraOutlined />}
        title="Take Screenshot"
        type="ghost"
        onClick={handleScreenshot}
        disabled={!selectedDevice}
        loading={isTakingScreenshot}
      />
      <AntButton
        icon={<VideoCameraOutlined />}
        title="Make Screen Recording"
        type={isRecording ? 'primary' : 'ghost'}
        onClick={handleRecording}
        disabled={!selectedDevice || !isRecordingAvailable}
        danger={isRecording}
      />
    </>
  ) : (
    <ButtonGroup>
      <Button
        compact={true}
        onClick={handleScreenshot}
        icon="camera"
        title="Take Screenshot"
        disabled={!selectedDevice}
      />
      <Button
        compact={true}
        onClick={handleRecording}
        icon={isRecording ? 'stop-playback' : 'camcorder'}
        pulse={isRecording}
        selected={isRecording}
        title="Make Screen Recording"
        disabled={!selectedDevice || !isRecordingAvailable}
      />
    </ButtonGroup>
  );
}

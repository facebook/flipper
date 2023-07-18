/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button as AntButton, message} from 'antd';
import React, {useState, useCallback} from 'react';
import {capture, getCaptureLocation, getFileName} from '../utils/screenshot';
import {CameraOutlined, VideoCameraOutlined} from '@ant-design/icons';
import {useStore} from '../utils/useStore';
import {getRenderHostInstance} from 'flipper-frontend-core';
import {path} from 'flipper-plugin';
import {NavbarButton} from '../sandy-chrome/Navbar';

async function openFile(path: string) {
  getRenderHostInstance().flipperServer.exec('open-file', path);
}

export function NavbarScreenshotButton() {
  const selectedDevice = useStore((state) => state.connections.selectedDevice);
  const [isTakingScreenshot, setIsTakingScreenshot] = useState(false);

  const handleScreenshot = useCallback(() => {
    setIsTakingScreenshot(true);
    return capture(selectedDevice!)
      .then(openFile)
      .catch((e) => {
        console.error('Taking screenshot failed:', e);
        message.error('Taking screenshot failed:' + e);
      })
      .finally(() => {
        setIsTakingScreenshot(false);
      });
  }, [selectedDevice]);

  return (
    <NavbarButton
      icon={CameraOutlined}
      label="Screenshot"
      onClick={handleScreenshot}
      disabled={
        !selectedDevice ||
        !selectedDevice.description.features.screenshotAvailable
      }
      toggled={isTakingScreenshot}
    />
  );
}

export function NavbarScreenRecordButton() {
  const selectedDevice = useStore((state) => state.connections.selectedDevice);
  const [isRecording, setIsRecording] = useState(false);

  const handleRecording = useCallback(() => {
    if (!selectedDevice) {
      return;
    }
    if (!isRecording) {
      setIsRecording(true);
      const videoPath = path.join(getCaptureLocation(), getFileName('mp4'));
      return selectedDevice.startScreenCapture(videoPath).catch((e) => {
        console.warn('Failed to start recording', e);
        message.error('Failed to start recording' + e);
        setIsRecording(false);
      });
    } else {
      return selectedDevice
        .stopScreenCapture()
        .then((f) => {
          if (f) {
            return openFile(f);
          }
        })
        .catch((e) => {
          console.warn('Failed to stop recording', e);
          message.error('Failed to stop recording' + e);
        })
        .finally(() => {
          setIsRecording(false);
        });
    }
  }, [selectedDevice, isRecording]);

  return (
    <NavbarButton
      icon={VideoCameraOutlined}
      label="Record"
      onClick={handleRecording}
      disabled={
        !selectedDevice ||
        !selectedDevice.description.features.screenCaptureAvailable
      }
      toggled={isRecording}
    />
  );
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {message} from 'antd';
import React, {useState, useCallback, useEffect} from 'react';
import {capture, getCaptureLocation, getFileName} from '../utils/screenshot';
import {
  CameraOutlined,
  VideoCameraFilled,
  VideoCameraOutlined,
} from '@ant-design/icons';
import {useStore} from '../utils/useStore';
import {path, theme} from 'flipper-plugin';
import {NavbarButton} from '../sandy-chrome/Navbar';
import {getFlipperServer} from '../flipperServer';

async function openFile(path: string) {
  getFlipperServer().exec('open-file', path);
}

export function NavbarScreenshotButton() {
  const selectedDevice = useStore((state) => state.connections.selectedDevice);
  const [isTakingScreenshot, setIsTakingScreenshot] = useState(false);

  const handleScreenshot = useCallback(() => {
    setIsTakingScreenshot(true);
    // TODO: Fix this the next time the file is edited.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return capture(selectedDevice!)
      .then(openFile)
      .catch((e) => {
        console.error('Taking screenshot failed:', e);
        message.error(`Taking screenshot failed:${e}`);
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
        message.error(`Failed to start recording${e}`);
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
          message.error(`Failed to stop recording${e}`);
        })
        .finally(() => {
          setIsRecording(false);
        });
    }
  }, [selectedDevice, isRecording]);

  const [red, setRed] = useState(false);
  useEffect(() => {
    if (isRecording) {
      setRed(true);
      const handle = setInterval(() => {
        setRed((red) => !red);
      }, FlashInterval);

      return () => {
        clearInterval(handle);
      };
    }
  }, [isRecording]);

  return (
    <NavbarButton
      icon={isRecording && red ? VideoCameraFilled : VideoCameraOutlined}
      label="Record"
      onClick={handleRecording}
      colorOverride={isRecording && red ? theme.errorColor : undefined}
      disabled={
        !selectedDevice ||
        !selectedDevice.description.features.screenCaptureAvailable
      }
      toggled={isRecording}
    />
  );
}

const FlashInterval = 600;

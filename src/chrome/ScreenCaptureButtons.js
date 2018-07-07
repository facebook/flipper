/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Button, ButtonGroup, Component} from 'sonar';
import {connect} from 'react-redux';
import AndroidDevice from '../devices/AndroidDevice';
import IOSDevice from '../devices/IOSDevice';
import os from 'os';
import fs from 'fs';
import adb from 'adbkit-fb';
import path from 'path';
import {exec} from 'child_process';

const SCREENSHOT_FILE_NAME = 'screen.png';
const VIDEO_FILE_NAME = 'video.mp4';
const SCREENSHOT_PATH = path.join(
  os.homedir(),
  '/.sonar/',
  SCREENSHOT_FILE_NAME,
);
const VIDEO_PATH = path.join(os.homedir(), '.sonar', VIDEO_FILE_NAME);

import type BaseDevice from '../devices/BaseDevice';

type PullTransfer = any;

type Props = {|
  devices: Array<BaseDevice>,
  selectedDeviceIndex: number,
|};

type State = {|
  pullingData: boolean,
  recording: boolean,
  recordingEnabled: boolean,
  capturingScreenshot: boolean,
|};

function openFile(path: string): Promise<*> {
  return new Promise((resolve, reject) => {
    exec(`${getOpenCommand()} ${path}`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(path);
      }
    });
  });
}

function getOpenCommand(): string {
  //TODO: TESTED ONLY ON MAC!
  switch (os.platform()) {
    case 'win32':
      return 'start';
    case 'linux':
      return 'xdg-open';
    default:
      return 'open';
  }
}

function writePngStreamToFile(stream: PullTransfer): Promise<string> {
  return new Promise((resolve, reject) => {
    stream.on('end', () => {
      resolve(SCREENSHOT_PATH);
    });
    stream.on('error', reject);
    stream.pipe(fs.createWriteStream(SCREENSHOT_PATH));
  });
}

class ScreenCaptureButtons extends Component<Props, State> {
  iOSRecorder: ?any;

  state = {
    pullingData: false,
    recording: false,
    recordingEnabled: false,
    capturingScreenshot: false,
  };

  componentDidMount() {
    this.checkIfRecordingIsAvailable();
  }

  componentWillReceiveProps(nextProps: Props) {
    this.checkIfRecordingIsAvailable(nextProps);
  }

  checkIfRecordingIsAvailable = (props: Props = this.props): void => {
    const {devices, selectedDeviceIndex} = props;
    const device: BaseDevice = devices[selectedDeviceIndex];

    if (device instanceof AndroidDevice) {
      this.executeShell(
        device,
        `[ ! -f /system/bin/screenrecord ] && echo "File does not exist"`,
      ).then(output =>
        this.setState({
          recordingEnabled: !output,
        }),
      );
    } else if (
      device instanceof IOSDevice &&
      device.deviceType === 'emulator'
    ) {
      this.setState({
        recordingEnabled: true,
      });
    } else {
      this.setState({
        recordingEnabled: false,
      });
    }
  };

  captureScreenshot = () => {
    const {devices, selectedDeviceIndex} = this.props;
    const device: BaseDevice = devices[selectedDeviceIndex];

    if (device instanceof AndroidDevice) {
      return device.adb
        .screencap(device.serial)
        .then(writePngStreamToFile)
        .then(openFile)
        .catch(console.error);
    } else if (device instanceof IOSDevice) {
      exec(
        `xcrun simctl io booted screenshot ${SCREENSHOT_PATH}`,
        (err, data) => {
          if (err) {
            console.error(err);
          } else {
            openFile(SCREENSHOT_PATH);
          }
        },
      );
    }
  };

  startRecording = () => {
    const {devices, selectedDeviceIndex} = this.props;
    const device: BaseDevice = devices[selectedDeviceIndex];

    if (device instanceof AndroidDevice) {
      this.setState({
        recording: true,
      });
      this.executeShell(
        device,
        `screenrecord --bugreport /sdcard/${VIDEO_FILE_NAME}`,
      )
        .then(output => {
          if (output) {
            throw output;
          }
        })
        .then(() => {
          this.setState({
            recording: false,
            pullingData: true,
          });
        })
        .then(
          (): Promise<string> => {
            return this.pullFromDevice(
              device,
              `/sdcard/${VIDEO_FILE_NAME}`,
              VIDEO_PATH,
            );
          },
        )
        .then(openFile)
        .then(() => {
          this.executeShell(device, `rm /sdcard/${VIDEO_FILE_NAME}`);
        })
        .then(() => {
          this.setState({
            pullingData: false,
          });
        })
        .catch(error => {
          console.error(`unable to capture video: ${error}`);
          this.setState({
            recording: false,
            pullingData: false,
          });
        });
    } else if (device instanceof IOSDevice) {
      this.setState({
        recording: true,
      });
      this.iOSRecorder = exec(
        `xcrun simctl io booted recordVideo ${VIDEO_PATH}`,
      );
    }
  };

  pullFromDevice = (
    device: AndroidDevice,
    src: string,
    dst: string,
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      return device.adb.pull(device.serial, src).then(stream => {
        stream.on('end', () => {
          resolve(dst);
        });
        stream.on('error', reject);
        stream.pipe(fs.createWriteStream(dst));
      });
    });
  };

  stopRecording = () => {
    const {devices, selectedDeviceIndex} = this.props;
    const device: BaseDevice = devices[selectedDeviceIndex];
    if (device instanceof AndroidDevice) {
      this.executeShell(device, `pgrep 'screenrecord' -L 2`);
    } else if (this.iOSRecorder) {
      this.iOSRecorder.kill();
      this.setState({
        recording: false,
      });
      openFile(VIDEO_PATH);
    }
  };

  executeShell = (device: AndroidDevice, command: string): Promise<string> => {
    return device.adb
      .shell(device.serial, command)
      .then(adb.util.readAll)
      .then(output => output.toString().trim());
  };

  onRecordingClicked = () => {
    if (this.state.recording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  };

  render() {
    const {recordingEnabled} = this.state;
    const {devices, selectedDeviceIndex} = this.props;
    const device: ?BaseDevice =
      selectedDeviceIndex > -1 ? devices[selectedDeviceIndex] : null;

    return (
      <ButtonGroup>
        <Button
          compact={true}
          onClick={this.captureScreenshot}
          icon="camera"
          title="Take Screenshot"
          disabled={!device}
        />
        <Button
          compact={true}
          onClick={this.onRecordingClicked}
          icon={this.state.recording ? 'stop-playback' : 'camcorder'}
          pulse={this.state.recording}
          selected={this.state.recording}
          title="Make Screen Recording"
          disabled={!device || !recordingEnabled}
        />
      </ButtonGroup>
    );
  }
}

export default connect(({connections: {devices, selectedDeviceIndex}}) => ({
  devices,
  selectedDeviceIndex,
}))(ScreenCaptureButtons);

/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {SonarDevicePlugin} from 'sonar';

import {
  Button,
  FlexColumn,
  FlexRow,
  LoadingIndicator,
  styled,
  colors,
  Component,
} from 'sonar';

const os = require('os');
const fs = require('fs');
const adb = require('adbkit-fb');
const path = require('path');
const exec = require('child_process').exec;
const SCREENSHOT_FILE_NAME = 'screen.png';
const VIDEO_FILE_NAME = 'video.mp4';
const SCREENSHOT_PATH = path.join(
  os.homedir(),
  '/.sonar/',
  SCREENSHOT_FILE_NAME,
);
const VIDEO_PATH = path.join(os.homedir(), '.sonar', VIDEO_FILE_NAME);

type AndroidDevice = any;
type AdbClient = any;
type PullTransfer = any;

type State = {|
  pullingData: boolean,
  recording: boolean,
  recordingEnabled: boolean,
  capturingScreenshot: boolean,
|};

const BigButton = Button.extends({
  height: 200,
  width: 200,
  flexGrow: 1,
  fontSize: 24,
});

const ButtonContainer = FlexRow.extends({
  alignItems: 'center',
  justifyContent: 'space-around',
  padding: 20,
});

const LoadingSpinnerContainer = FlexRow.extends({
  flexGrow: 1,
  padding: 24,
  justifyContent: 'center',
  alignItems: 'center',
});

const LoadingSpinnerText = styled.text({
  fontSize: 24,
  marginLeft: 12,
  color: colors.grey,
});

class LoadingSpinner extends Component<{}, {}> {
  render() {
    return (
      <LoadingSpinnerContainer>
        <LoadingIndicator />
        <LoadingSpinnerText>Pulling files from device...</LoadingSpinnerText>
      </LoadingSpinnerContainer>
    );
  }
}

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

export default class ScreenPlugin extends SonarDevicePlugin<State> {
  static id = 'DeviceScreen';
  static title = 'Screen';
  static icon = 'mobile';

  device: AndroidDevice;
  adbClient: AdbClient;

  init() {
    this.adbClient = this.device.adb;

    this.executeShell(
      `[ ! -f /system/bin/screenrecord ] && echo "File does not exist"`,
    ).then(output => {
      if (output) {
        console.error(
          'screenrecord util does not exist. Most likely it is an emulator which does not support screen recording via adb',
        );
        this.setState({
          recordingEnabled: false,
        });
      } else {
        this.setState({
          recordingEnabled: true,
        });
      }
    });
  }

  captureScreenshot = () => {
    return this.adbClient
      .screencap(this.device.serial)
      .then(writePngStreamToFile)
      .then(openFile)
      .catch(error => {
        //TODO: proper logging?
        console.error(error);
      });
  };

  pullFromDevice = (src: string, dst: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      return this.adbClient.pull(this.device.serial, src).then(stream => {
        stream.on('end', () => {
          resolve(dst);
        });
        stream.on('error', reject);
        stream.pipe(fs.createWriteStream(dst));
      });
    });
  };

  onRecordingClicked = () => {
    if (this.state.recording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  };

  onScreenshotClicked = () => {
    var self = this;
    this.setState({
      capturingScreenshot: true,
    });
    this.captureScreenshot().then(() => {
      self.setState({
        capturingScreenshot: false,
      });
    });
  };

  startRecording = () => {
    const self = this;
    this.setState({
      recording: true,
    });
    this.executeShell(`screenrecord --bugreport /sdcard/${VIDEO_FILE_NAME}`)
      .then(output => {
        if (output) {
          throw output;
        }
      })
      .then(() => {
        self.setState({
          recording: false,
          pullingData: true,
        });
      })
      .then(
        (): Promise<string> => {
          return self.pullFromDevice(`/sdcard/${VIDEO_FILE_NAME}`, VIDEO_PATH);
        },
      )
      .then(openFile)
      .then(() => {
        self.executeShell(`rm /sdcard/${VIDEO_FILE_NAME}`);
      })
      .then(() => {
        self.setState({
          pullingData: false,
        });
      })
      .catch(error => {
        console.error(`unable to capture video: ${error}`);
        self.setState({
          recording: false,
          pullingData: false,
        });
      });
  };

  stopRecording = () => {
    this.executeShell(`pgrep 'screenrecord' -L 2`);
  };

  executeShell = (command: string): Promise<string> => {
    return this.adbClient
      .shell(this.device.serial, command)
      .then(adb.util.readAll)
      .then(output => {
        return new Promise((resolve, reject) => {
          resolve(output.toString().trim());
        });
      });
  };

  getLoadingSpinner = () => {
    return this.state.pullingData ? <LoadingSpinner /> : null;
  };

  render() {
    const recordingEnabled =
      this.state.recordingEnabled &&
      !this.state.capturingScreenshot &&
      !this.state.pullingData;
    const screenshotEnabled =
      !this.state.recording &&
      !this.state.capturingScreenshot &&
      !this.state.pullingData;
    return (
      <FlexColumn>
        <ButtonContainer>
          <BigButton
            key="video_btn"
            onClick={!recordingEnabled ? null : this.onRecordingClicked}
            icon={this.state.recording ? 'stop' : 'camcorder'}
            disabled={!recordingEnabled}
            selected={true}
            pulse={this.state.recording}
            iconSize={24}>
            {!this.state.recording ? 'Record screen' : 'Stop recording'}
          </BigButton>
          <BigButton
            key="screenshot_btn"
            icon="camera"
            selected={true}
            onClick={!screenshotEnabled ? null : this.onScreenshotClicked}
            iconSize={24}
            pulse={this.state.capturingScreenshot}
            disabled={!screenshotEnabled}>
            Take screenshot
          </BigButton>
        </ButtonContainer>
        {this.getLoadingSpinner()}
      </FlexColumn>
    );
  }
}

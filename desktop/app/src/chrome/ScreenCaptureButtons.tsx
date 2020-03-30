/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button, ButtonGroup} from 'flipper';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import path from 'path';
import BaseDevice from '../devices/BaseDevice';
import {State as Store} from '../reducers';
import open from 'open';
import {capture, CAPTURE_LOCATION, getFileName} from '../utils/screenshot';

type OwnProps = {};

type StateFromProps = {
  selectedDevice: BaseDevice | null | undefined;
};

type DispatchFromProps = {};

type State = {
  recording: boolean;
  recordingEnabled: boolean;
  capturingScreenshot: boolean;
};

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

type Props = OwnProps & StateFromProps & DispatchFromProps;
class ScreenCaptureButtons extends Component<Props, State> {
  videoPath: string | null | undefined;

  state = {
    recording: false,
    recordingEnabled: false,
    capturingScreenshot: false,
  };

  componentDidMount() {
    this.checkIfRecordingIsAvailable();
  }

  UNSAFE_componentWillReceiveProps(nextProps: Props) {
    if (nextProps.selectedDevice !== this.props.selectedDevice) {
      this.checkIfRecordingIsAvailable(nextProps);
    }
  }

  checkIfRecordingIsAvailable = async (props: Props = this.props) => {
    const {selectedDevice} = props;
    const recordingEnabled = selectedDevice
      ? await selectedDevice.screenCaptureAvailable()
      : false;
    this.setState({recordingEnabled});
  };

  captureScreenshot: Promise<void> | any = async () => {
    const {selectedDevice} = this.props;
    if (selectedDevice != null) {
      await capture(selectedDevice);
    }
  };

  startRecording = async () => {
    const {selectedDevice} = this.props;
    if (!selectedDevice) {
      return;
    }
    const videoPath = path.join(CAPTURE_LOCATION, getFileName('mp4'));
    return selectedDevice.startScreenCapture(videoPath);
  };

  stopRecording = async () => {
    const {selectedDevice} = this.props;
    if (!selectedDevice) {
      return;
    }
    const path = await selectedDevice.stopScreenCapture().catch((e) => {
      console.error(e);
    });
    path ? openFile(path) : 0;
  };

  onRecordingClicked = () => {
    if (this.state.recording) {
      this.stopRecording();
      this.setState({
        recording: false,
      });
    } else {
      this.setState({
        recording: true,
      });
      this.startRecording().catch((e) => {
        this.setState({
          recording: false,
        });
        console.error(e);
      });
    }
  };

  render() {
    const {recordingEnabled} = this.state;
    const {selectedDevice} = this.props;

    return (
      <ButtonGroup>
        <Button
          compact={true}
          onClick={this.captureScreenshot}
          icon="camera"
          title="Take Screenshot"
          disabled={!selectedDevice}
        />
        <Button
          compact={true}
          onClick={this.onRecordingClicked}
          icon={this.state.recording ? 'stop-playback' : 'camcorder'}
          pulse={this.state.recording}
          selected={this.state.recording}
          title="Make Screen Recording"
          disabled={!selectedDevice || !recordingEnabled}
        />
      </ButtonGroup>
    );
  }
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({connections: {selectedDevice}}) => ({
    selectedDevice,
  }),
)(ScreenCaptureButtons);

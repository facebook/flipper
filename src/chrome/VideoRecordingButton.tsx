/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {Component} from 'react';
import BaseDevice from '../devices/BaseDevice';
import {Button, Glyph, colors} from '../ui';
import path from 'path';
import os from 'os';

type OwnProps = {
  recordingFinished: (path: string | null) => void;
};

type StateFromProps = {
  selectedDevice: BaseDevice | null | undefined;
};

type DispatchFromProps = {};

type State = {
  recording: boolean;
  recordingEnabled: boolean;
};
type Props = OwnProps & StateFromProps & DispatchFromProps;

export default class VideoRecordingButton extends Component<Props, State> {
  state: State = {
    recording: false,
    recordingEnabled: true,
  };

  startRecording = async () => {
    const {selectedDevice} = this.props;
    if (!selectedDevice) {
      return;
    }

    const flipperDirectory = path.join(os.homedir(), '.flipper');
    const fileName = `screencap-${new Date()
      .toISOString()
      .replace(/:/g, '')}.mp4`;
    const videoPath = path.join(flipperDirectory, fileName);
    this.setState({
      recording: true,
    });
    selectedDevice.startScreenCapture(videoPath).catch(e => {
      console.error('Screen recording failed:', e);
      this.setState({
        recording: false,
      });
    });
  };

  stopRecording = async () => {
    const {selectedDevice} = this.props;
    if (!selectedDevice) {
      return;
    }
    const path = await selectedDevice.stopScreenCapture();
    this.setState({
      recording: false,
    });
    this.props.recordingFinished(path);
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
    const {selectedDevice} = this.props;
    return (
      <Button
        compact={true}
        onClick={this.onRecordingClicked}
        pulse={this.state.recording}
        selected={this.state.recording}
        title="Make Screen Recording"
        disabled={!selectedDevice || !recordingEnabled}
        type={this.state.recording ? 'danger' : 'primary'}>
        <Glyph
          name={this.state.recording ? 'stop-playback' : 'camcorder'}
          color={this.state.recording ? colors.red : colors.white}
          variant="filled"
          style={{marginRight: 8}}
        />
        {this.state.recording ? 'Recording...' : 'Start Recording'}
      </Button>
    );
  }
}

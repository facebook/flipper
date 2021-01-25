/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button} from '../ui';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {State as Store} from '../reducers';
import {launchJsEmulator} from '../utils/js-client-server-utils/serverUtils';
import {updateSettings, Action} from '../reducers/settings';
import {Settings} from '../reducers/settings';
import {Collapse, Form, Input as AntInput} from 'antd';
import {Html5Outlined} from '@ant-design/icons';

type OwnProps = {
  onHide: () => void;
};

type StateFromProps = {
  settings: Settings;
};

type DispatchFromProps = {
  updateSettings: (settings: Settings) => Action;
};

type State = {
  url: string;
  height: number;
  width: number;
};

type Props = OwnProps & StateFromProps & DispatchFromProps;
class JSEmulatorLauncherSheet extends Component<Props, State> {
  state: State = {...this.props.settings.jsApps.webAppLauncher};

  applyChanges = async () => {
    launchJsEmulator(this.state.url, this.state.height, this.state.width);
    this.props.updateSettings({
      ...this.props.settings,
      jsApps: {
        webAppLauncher: {...this.state},
      },
    });
    this.props.onHide();
  };

  onUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({url: e.target.value});
  };

  onHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({height: Number(e.target.value)});
  };

  onWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({width: Number(e.target.value)});
  };

  render() {
    const {url, height, width} = this.state;
    return (
      <Form labelCol={{span: 4}}>
        <Form.Item label="Url">
          <AntInput value={url} onChange={this.onUrlChange} />
        </Form.Item>
        <Form.Item label="Height">
          <AntInput value={height} onChange={this.onHeightChange} />
        </Form.Item>
        <Form.Item label="Width">
          <AntInput value={width} onChange={this.onWidthChange} />
        </Form.Item>
        <Form.Item wrapperCol={{offset: 4}}>
          <Button onClick={this.applyChanges} type="primary">
            Launch
          </Button>
        </Form.Item>
      </Form>
    );
  }
}

const Launcher = connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({settingsState}) => ({
    settings: settingsState,
  }),
  {updateSettings},
)(JSEmulatorLauncherSheet);

export default Launcher;

export function JSEmulatorLauncherSheetSandy({onClose}: {onClose(): void}) {
  return (
    <Collapse>
      <Collapse.Panel
        extra={<Html5Outlined />}
        header="Launch JS Web App"
        key="launch-js-web-app">
        <Launcher onHide={onClose} />
      </Collapse.Panel>
    </Collapse>
  );
}

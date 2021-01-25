/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlexColumn, Button, styled, Text, Input, Link, colors} from '../ui';
import React, {Component} from 'react';
import {writeKeychain, getUser} from '../fb-stubs/user';
import {login} from '../reducers/user';
import {connect} from 'react-redux';
import {State as Store} from '../reducers';
import ContextMenu from '../ui/components/ContextMenu';
import {clipboard} from 'electron';
import {reportPlatformFailures} from '../utils/metrics';
import {Modal} from 'antd';
import {TrackingScope} from 'flipper-plugin';

const Title = styled(Text)({
  marginBottom: 6,
  fontWeight: 600,
});

const InfoText = styled(Text)({
  lineHeight: 1.35,
  marginBottom: 15,
});

const TokenInput = styled(Input)({
  marginRight: 0,
});

type OwnProps = {
  onHide: () => any;
};

type StateFromProps = {};

type DispatchFromProps = {
  login: (user: Object) => any;
};

type State = {
  token: string;
  loading: boolean;
  error: string | null | undefined;
};

type Props = OwnProps & StateFromProps & DispatchFromProps;
class SignInSheet extends Component<Props, State> {
  state = {
    token: '',
    loading: false,
    error: null,
  };

  login = async (token: string) => {
    await writeKeychain(token);
    const user = await getUser();
    if (user) {
      this.props.login(user);
    } else {
      throw new Error('Failed to login using the provided token');
    }
  };

  saveToken = async (token: string) => {
    this.setState({token, loading: true});
    try {
      await reportPlatformFailures(this.login(token), 'auth:login');
      this.setState({loading: false});
      this.props.onHide();
    } catch (error) {
      console.error(error);
      this.setState({
        loading: false,
        error: `${error}`,
      });
    }
  };

  onPaste = () => {
    if (!this.state.token || this.state.token === '') {
      const token = clipboard.readText();
      // If pasted content looks like a token, we could try to login using it straight away!
      if (token && token.length >= 100 && token.indexOf(' ') < 0) {
        this.saveToken(token);
      }
    }
  };

  signIn = () => {
    this.saveToken(this.state.token);
  };

  getContextMenu = () => {
    const menu: Array<Electron.MenuItemConstructorOptions> = [
      {
        label: 'Paste',
        role: 'paste',
        click: this.onPaste,
      },
      {
        label: 'Reset',
        click: this.reset,
      },
    ];
    return menu;
  };

  reset = () => {
    this.setState({token: '', error: ''});
  };

  renderSandyContainer(
    contents: React.ReactElement,
    footer: React.ReactElement,
  ) {
    return (
      <TrackingScope scope="logindialog">
        <Modal
          visible
          centered
          onCancel={this.props.onHide}
          width={570}
          title="Login"
          footer={footer}>
          <FlexColumn>{contents}</FlexColumn>
        </Modal>
      </TrackingScope>
    );
  }

  render() {
    const content = (
      <>
        <Title>You are not currently logged in to Facebook.</Title>
        <InfoText>
          To log in you will need to{' '}
          <Link href="https://www.internalfb.com/intern/oauth/nuclide/">
            open this page
          </Link>
          , copy the Nuclide access token you find on that page to clipboard,
          and click the text input below to paste it.
        </InfoText>
        <ContextMenu items={this.getContextMenu()}>
          <TokenInput
            disabled={this.state.loading}
            placeholder="Click to paste Nuclide Access Token from clipboard"
            onClick={this.onPaste}
            value={this.state.token}
            onPaste={this.onPaste}
            onChange={(e) => this.setState({token: e.target.value})}
          />
        </ContextMenu>
        {this.state.error && (
          <>
            <br />
            <InfoText color={colors.red}>
              <strong>Error:</strong>&nbsp;{this.state.error}
            </InfoText>
          </>
        )}
      </>
    );
    const footer = (
      <>
        <Button compact padded onClick={this.props.onHide}>
          Cancel
        </Button>
        <Button compact padded onClick={this.reset}>
          Reset
        </Button>
        <Button type="primary" compact padded onClick={this.signIn}>
          Sign In
        </Button>
      </>
    );

    return this.renderSandyContainer(content, footer);
  }
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  () => ({}),
  {login},
)(SignInSheet);

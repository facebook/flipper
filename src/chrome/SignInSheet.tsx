/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  FlexColumn,
  Button,
  styled,
  Text,
  FlexRow,
  Spacer,
  Input,
  Link,
  colors,
} from 'flipper';
import React, {Component} from 'react';
import {writeKeychain, getUser} from '../fb-stubs/user';
import {login} from '../reducers/user';
import {connect} from 'react-redux';
import {State as Store} from '../reducers';

const Container = styled(FlexColumn)({
  padding: 20,
  width: 500,
});

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

  saveToken = async () => {
    this.setState({loading: true});
    const {token} = this.state;
    if (token) {
      await writeKeychain(token);
      try {
        const user = await getUser();
        if (user) {
          this.props.login(user);
        }
        this.props.onHide();
      } catch (error) {
        console.error(error);
        this.setState({token: '', loading: false, error: `${error}`});
      }
    }
  };

  render() {
    return (
      <Container>
        <Title>You are not currently logged in to Facebook.</Title>
        <InfoText>
          To log in you will need to{' '}
          <Link href="https://our.internmc.facebook.com/intern/oauth/nuclide/">
            open this page
          </Link>
          , copy the Nuclide access token you find on that page, and paste it
          into the text input below.
        </InfoText>
        <TokenInput
          disabled={this.state.loading}
          placeholder="Nuclide Access Token"
          value={this.state.token}
          onChange={e => this.setState({token: e.target.value})}
        />
        <br />
        {this.state.error && (
          <InfoText color={colors.red}>
            <strong>Error:</strong>&nbsp;{this.state.error}
          </InfoText>
        )}
        <br />
        <FlexRow>
          <Spacer />
          <Button compact padded onClick={this.props.onHide}>
            Cancel
          </Button>
          <Button type="primary" compact padded onClick={this.saveToken}>
            Sign In
          </Button>
        </FlexRow>
      </Container>
    );
  }
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  () => ({}),
  {login},
)(SignInSheet);

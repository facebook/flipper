/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {User, USER_UNAUTHORIZED, USER_NOT_SIGNEDIN} from '../reducers/user';
import {ActiveSheet} from '../reducers/application';

import {styled, FlexRow, Glyph, Text, colors} from 'flipper';
import {logout} from '../reducers/user';
import {setActiveSheet, ACTIVE_SHEET_SIGN_IN} from '../reducers/application';
import {connect} from 'react-redux';
import electron from 'electron';
import {findDOMNode} from 'react-dom';
import React, {PureComponent} from 'react';
import {getUser} from '../fb-stubs/user';
import config from '../fb-stubs/config';

const Container = styled(FlexRow)({
  alignItems: 'center',
  padding: '5px 10px',
  borderTop: `1px solid ${colors.blackAlpha10}`,
  fontWeight: 500,
  flexShrink: 0,
  minHeight: 36,
  color: colors.blackAlpha80,
});

const ProfilePic = styled.img({
  borderRadius: '999em',
  flexShrink: 0,
  width: 24,
  marginRight: 6,
});

const UserName = styled(Text)({
  flexGrow: 1,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  marginRight: 6,
  textOverflow: 'ellipsis',
});

type OwnProps = {};

type DispatchFromProps = {
  logout: () => void;
  setActiveSheet: (activeSheet: ActiveSheet) => void;
};

type StateFromProps = {
  user: User;
};

type Props = OwnProps & DispatchFromProps & StateFromProps;
class UserAccount extends PureComponent<Props> {
  _ref: Element | null | undefined;

  setRef = (ref: HTMLDivElement | null) => {
    const element = findDOMNode(ref);
    if (element instanceof HTMLElement) {
      this._ref = element;
    }
  };

  showDetails = () => {
    const menuTemplate: Array<Electron.MenuItemConstructorOptions> = [
      {
        label: 'Sign Out',
        click: this.props.logout,
      },
    ];

    const menu = electron.remote.Menu.buildFromTemplate(menuTemplate);
    const {bottom = null, left = null} = this._ref
      ? this._ref.getBoundingClientRect()
      : {};
    menu.popup({
      window: electron.remote.getCurrentWindow(),
      // @ts-ignore async is not part of public api in electron menu popup
      async: true,
      x: left || 10,
      y: (bottom || 10) + 8,
    });
  };

  openLogin = () => this.props.setActiveSheet(ACTIVE_SHEET_SIGN_IN);

  componentDidMount() {
    if (config.showLogin) {
      getUser().catch(error => {
        if (error === USER_UNAUTHORIZED || error === USER_NOT_SIGNEDIN) {
          this.openLogin();
        }
      });
    }
  }

  render() {
    const {user} = this.props;
    const name = user ? user.name : null;
    return name ? (
      <Container ref={this.setRef} onClick={this.showDetails}>
        <ProfilePic
          src={user.profile_picture ? user.profile_picture.uri : undefined}
        />
        <UserName>{this.props.user.name}</UserName>
        <Glyph name="chevron-down" size={10} variant="outline" />
      </Container>
    ) : (
      <Container onClick={this.openLogin}>
        <Glyph
          name="profile-circle"
          size={16}
          variant="outline"
          color={colors.blackAlpha50}
        />
        &nbsp;Sign In...
      </Container>
    );
  }
}

// @TODO: TS_MIGRATION
type Store = any;
export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({user}) => ({
    user,
  }),
  {
    logout,
    setActiveSheet,
  },
)(UserAccount);

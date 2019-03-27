/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {User} from '../reducers/user';
import type {ActiveSheet} from '../reducers/application';

import {styled, PureComponent, FlexRow, Glyph, Text, colors} from 'flipper';
import {logout} from '../reducers/user';
import {setActiveSheet, ACTIVE_SHEET_SIGN_IN} from '../reducers/application.js';
import {connect} from 'react-redux';
import electron from 'electron';
import {findDOMNode} from 'react-dom';

const Container = styled(FlexRow)({
  alignItems: 'center',
  padding: '5px 10px',
  borderTop: `1px solid ${colors.blackAlpha10}`,
  fontWeight: 500,
  flexShrink: 0,
  minHeight: 36,
  color: colors.blackAlpha80,
});

const ProfilePic = styled('img')({
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

type UserAccountProps = {|
  user: User,
  logout: () => void,
  setActiveSheet: (activeSheet: ActiveSheet) => void,
|};

class UserAccount extends PureComponent<UserAccountProps> {
  _ref: ?Element;

  setRef = (ref: React.ElementRef<*>) => {
    const element = findDOMNode(ref);
    if (element instanceof HTMLElement) {
      this._ref = element;
    }
  };

  showDetails = () => {
    const menuTemplate = [
      {
        label: 'Sign Out',
        click: this.props.logout,
      },
    ];

    const menu = electron.remote.Menu.buildFromTemplate(menuTemplate);
    const {bottom, left} = this._ref ? this._ref.getBoundingClientRect() : {};
    menu.popup({
      window: electron.remote.getCurrentWindow(),
      async: true,
      x: parseInt(left, 10),
      y: parseInt(bottom, 10) + 8,
    });
  };

  render() {
    return this.props.user?.name ? (
      <Container innerRef={this.setRef} onClick={this.showDetails}>
        <ProfilePic src={this.props.user.profile_picture?.uri} />
        <UserName>{this.props.user.name}</UserName>
        <Glyph name="chevron-down" size={10} variant="outline" />
      </Container>
    ) : (
      <Container
        onClick={() => this.props.setActiveSheet(ACTIVE_SHEET_SIGN_IN)}>
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

export default connect<UserAccountProps, {||}, _, _, _, _>(
  ({user}) => ({
    user,
  }),
  {
    logout,
    setActiveSheet,
  },
)(UserAccount);

/**
 * Copyright 2004-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const PropTypes = require('prop-types');
const React = require('react');

export type Theme = {|
  accent: string,
  primary: string,
  success: string,
  warning: string,
  danger: string,
  dark: boolean,
|};

export class ThemeCatcher extends React.Component<{
  receive: (theme: Theme) => any,
}> {
  render() {
    return this.props.receive(this.context.STYLED_THEME);
  }
}

export class ThemeProvider extends React.Component<{
  theme: $Shape<Theme>,
  children?: React$Node,
}> {
  getChildContext() {
    return {
      STYLED_THEME: Object.assign(
        {},
        this.context.STYLED_THEME || {},
        this.props.theme,
      ),
    };
  }

  render() {
    return this.props.children;
  }
}

ThemeCatcher.contextTypes = ThemeProvider.childContextTypes = {
  STYLED_THEME: PropTypes.any,
};

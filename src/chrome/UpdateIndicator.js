/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {LauncherMsg} from '../reducers/application.js';
import {colors, Component, FlexRow, Glyph, styled} from 'flipper';

const Container = styled(FlexRow)({
  alignItems: 'center',
  marginLeft: 4,
});

type Props = {
  launcherMsg: LauncherMsg,
};

function getSeverityColor(severity: 'warning' | 'error'): string {
  switch (severity) {
    case 'warning':
      return colors.light30;
    case 'error':
      return colors.cherry;
  }
  // Flow isn't smart enough to see that the above is already exhaustive.
  return '';
}

export default class UpdateIndicator extends Component<Props, void> {
  render() {
    if (this.props.launcherMsg.message.length == 0) {
      return null;
    }

    return (
      <Container>
        <span title={this.props.launcherMsg.message}>
          <Glyph
            color={getSeverityColor(this.props.launcherMsg.severity)}
            name="caution-triangle"
          />
        </span>
      </Container>
    );
  }
}

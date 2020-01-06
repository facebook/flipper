/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {colors} from '../ui/components/colors';
import {styled, Glyph} from '../ui';
import {connect} from 'react-redux';
import {State} from '../reducers';
import React, {ReactElement} from 'react';
import Text from '../ui/components/Text';
import {pluginIsStarred} from '../reducers/connections';

const StatusBarContainer = styled(Text)({
  backgroundColor: colors.macOSTitleBarBackgroundBlur,
  borderTop: '1px solid #b3b3b3',
  lineHeight: '26px',
  padding: '0 10px',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  textAlign: 'center',
});

type Props = {
  statusMessage: React.ReactNode | string | null;
};

export function statusBarView(props: Props): ReactElement | null {
  const {statusMessage} = props;
  if (statusMessage) {
    return (
      <StatusBarContainer whiteSpace="nowrap">
        {statusMessage}
      </StatusBarContainer>
    );
  } else {
    return null;
  }
}

export default connect<Props, void, {}, State>((state: State) => {
  const {
    application: {statusMessages},
  } = state;
  if (statusMessages.length > 0) {
    return {statusMessage: statusMessages[statusMessages.length - 1]};
  } else if (isPreviewingBackgroundPlugin(state)) {
    return {
      statusMessage: (
        <>
          <Glyph
            name="caution-triangle"
            color={colors.light20}
            size={12}
            variant="filled"
            style={{marginRight: 8}}
          />
          The current plugin would like to send messages while it is in the
          background. However, since this plugin is not starred, these messages
          will be dropped. Star this plugin to unlock its full capabilities.
        </>
      ),
    };
  }
  return {
    statusMessage: null,
  };
})(statusBarView);

function isPreviewingBackgroundPlugin(state: State): boolean {
  const {
    connections: {selectedApp, selectedPlugin},
  } = state;
  if (!selectedPlugin || !selectedApp) {
    return false;
  }
  const activePlugin = state.plugins.clientPlugins.get(selectedPlugin);
  if (!activePlugin || !activePlugin.persistedStateReducer) {
    return false;
  }
  return !pluginIsStarred(state.connections, selectedPlugin);
}

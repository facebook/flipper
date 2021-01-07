/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {styled, colors} from '../ui';
import FpsGraph from '../chrome/FpsGraph';
import NetworkGraph from '../chrome/NetworkGraph';
import isProduction from '../utils/isProduction';
import UpdateIndicator from '../chrome/UpdateIndicator';
import {Version} from '../chrome/TitleBar';
import {useStore} from '../utils/useStore';
import {remote} from 'electron';
import config from '../fb-stubs/config';
import ReleaseChannel from '../ReleaseChannel';

const version = remote.app.getVersion();

const TemporarilyTitlebarContainer = styled('div')<{focused?: boolean}>(
  ({focused}) => ({
    textAlign: 'center',
    userSelect: 'none',
    height: '38px',
    lineHeight: '38px',
    fontSize: '10pt',
    color: colors.macOSTitleBarIcon,
    background: true
      ? `linear-gradient(to bottom, ${colors.macOSTitleBarBackgroundTop} 0%, ${colors.macOSTitleBarBackgroundBottom} 100%)`
      : colors.macOSTitleBarBackgroundBlur,
    borderBottom: `1px solid ${
      focused ? colors.macOSTitleBarBorder : colors.macOSTitleBarBorderBlur
    }`,
    WebkitAppRegion: 'drag',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  }),
);

// This component should be dropped, and insetTitlebar should be removed from Electron startup once Sandy is the default
// But: figure out where to put the graphs, version numbers, flipper rating ets :)
export function TemporarilyTitlebar() {
  const launcherMsg = useStore((state) => state.application.launcherMsg);
  const isFocused = useStore((state) => state.application.windowIsFocused);

  return (
    <TemporarilyTitlebarContainer focused={isFocused}>
      [Sandy] Flipper{' '}
      {!isProduction() && <NetworkGraph height={20} width={60} />}
      {!isProduction() && <FpsGraph height={20} width={60} />}
      <Version>
        {version +
          (isProduction() ? '' : '-dev') +
          (config.getReleaseChannel() !== ReleaseChannel.STABLE
            ? `-${config.getReleaseChannel()}`
            : '')}
      </Version>
      <UpdateIndicator launcherMsg={launcherMsg} version={version} />
    </TemporarilyTitlebarContainer>
  );
}

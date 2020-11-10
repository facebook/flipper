/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Alert} from 'antd';
import {LeftSidebar, SidebarTitle, InfoIcon} from '../LeftSidebar';
import {Layout, Link, styled} from '../../ui';
import {NUX, theme} from 'flipper-plugin';
import {AppSelector} from './AppSelector';
import {useStore} from '../../utils/useStore';
import {PluginList} from './PluginList';
import ScreenCaptureButtons from '../../chrome/ScreenCaptureButtons';
import MetroButton from '../../chrome/MetroButton';

const appTooltip = (
  <>
    Inspect apps by selecting connected devices and emulators. Navigate and
    bookmark frequent destinations in the app. Refresh, screenshot and
    screenrecord is also available.{' '}
    <Link href="https://fbflipper.com/docs/getting-started/index">
      Learn More
    </Link>
  </>
);

export function AppInspect() {
  const selectedDevice = useStore((state) => state.connections.selectedDevice);
  const isArchived = !!selectedDevice?.isArchived;

  return (
    <LeftSidebar>
      <Layout.Top>
        <Layout.Container borderBottom>
          <SidebarTitle actions={<InfoIcon>{appTooltip}</InfoIcon>}>
            App Inspect
          </SidebarTitle>
          <Layout.Container padv="small" padh="medium" gap={theme.space.large}>
            <AppSelector />
            {
              isArchived ? (
                <Alert
                  message="This device is a snapshot and cannot be interacted with."
                  type="info"
                />
              ) : null /* TODO: add bookmarks back T77016599 */
            }
            {!isArchived && (
              <Toolbar gap>
                <MetroButton useSandy />
                <ScreenCaptureButtons useSandy />
              </Toolbar>
            )}
          </Layout.Container>
        </Layout.Container>
        <Layout.ScrollContainer vertical padv={theme.space.large}>
          {selectedDevice ? (
            <PluginList />
          ) : (
            <Alert message="No device or app selected." type="info" />
          )}
        </Layout.ScrollContainer>
      </Layout.Top>
    </LeftSidebar>
  );
}

const Toolbar = styled(Layout.Horizontal)({
  '.ant-btn': {
    border: 'none',
  },
});

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useEffect} from 'react';
import {
  TrackingScope,
  useLogger,
  _Sidebar,
  Layout,
  Dialog,
  _PortalsManager,
  getFlipperLib,
} from 'flipper-plugin';
import {Link, styled} from '../ui';
import {theme} from 'flipper-plugin';
import {Navbar} from './Navbar';
import {useStore} from '../utils/useStore';
import {AppInspect} from './appinspect/AppInspect';
import PluginContainer from '../PluginContainer';
import {ContentContainer} from './ContentContainer';
import {getVersionString} from '../utils/versionString';
import config from '../fb-stubs/config';
import {WelcomeScreenStaticView} from './WelcomeScreen';
import fbConfig from '../fb-stubs/config';
import {isFBEmployee} from '../utils/fbEmployee';
import {Button, Modal, message, notification} from 'antd';
import isProduction from '../utils/isProduction';
import {uiPerfTracker} from '../utils/UIPerfTracker';
import {WarningOutlined} from '@ant-design/icons';
import {
  FlipperSetupWizard,
  hasSetupWizardCompleted,
} from '../chrome/FlipperSetupWizard';

export function SandyApp() {
  const logger = useLogger();
  const leftSidebarVisible = useStore(
    (state) => state.application.leftSidebarVisible,
  );
  const staticView = useStore((state) => state.connections.staticView);

  // Messages need to be pushed down to make sure they appear below
  // the navigation bar which has a height of 68px.
  message.config({
    top: 10,
    maxCount: 2,
  });

  useEffect(() => {
    const title = `Flipper (${getVersionString()}${
      config.isFBBuild ? '@FB' : ''
    })`;

    document.title = title;

    uiPerfTracker.track('ui-perf-sandy-container-rendered');

    if (!hasSetupWizardCompleted(window.localStorage)) {
      Dialog.showModal((onHide) => (
        <FlipperSetupWizard onHide={onHide} closable={false} />
      ));
    }

    // don't warn about logger, even with a new logger we don't want to re-register
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    isFBEmployee()
      .then((isEmployee) => {
        if (isEmployee) {
          if (process.env.FLIPPER_REACT_NATIVE_ONLY) {
            Dialog.showModal((onHide) => (
              <Modal
                closable={false}
                keyboard={false}
                maskClosable={false}
                open
                centered
                onCancel={() => onHide()}
                width={570}
                title={
                  <>
                    <WarningOutlined /> This Version of Flipper is Unsupported
                  </>
                }
                footer={
                  <>
                    <Button
                      type="primary"
                      onClick={() => {
                        getFlipperLib().openLink('munki://detail-Flipper');
                        onHide();
                      }}>
                      Open Flipper Stable instead
                    </Button>
                    <Button type="ghost" onClick={() => onHide()}>
                      I understand
                    </Button>
                  </>
                }>
                This version is only meant to be used for React Native
                debugging. It is not maintained and it doesn't receive updates.
                Instead, you should be using the main Flipper version from
                Managed Software Center for all other purposes.
              </Modal>
            ));
          } else if (fbConfig.warnFBEmployees && isProduction()) {
            notification.warning({
              placement: 'bottomLeft',
              message: 'Please use Flipper@FB',
              description: (
                <>
                  You are using the open-source version of Flipper. Install the
                  internal build from{' '}
                  <Link href="munki://detail-Flipper">
                    Managed Software Center
                  </Link>{' '}
                  to get access to more plugins.
                </>
              ),
              duration: null,
            });
          }
        }
      })
      .catch((e) => {
        console.warn('Failed to check if user is employee', e);
      });
  }, []);

  return (
    <RootElement>
      <Layout.Bottom>
        <Layout.Top gap={16}>
          <Navbar />
          <Layout.Left
            style={{
              paddingLeft: theme.space.large,
              paddingRight: theme.space.large,
            }}>
            <Layout.Horizontal>
              {leftSidebarVisible ? (
                <_Sidebar width={250} minWidth={220} maxWidth={800} gutter>
                  {<AppInspect />}
                </_Sidebar>
              ) : null}
            </Layout.Horizontal>
            <MainContainer>
              {staticView ? (
                <TrackingScope
                  scope={
                    (staticView as any).displayName ??
                    staticView.name ??
                    staticView.constructor?.name ??
                    'unknown static view'
                  }>
                  {staticView === WelcomeScreenStaticView ? (
                    React.createElement(staticView) /* avoid shadow */
                  ) : (
                    <ContentContainer>
                      {React.createElement(staticView, {
                        logger,
                      })}
                    </ContentContainer>
                  )}
                </TrackingScope>
              ) : (
                <PluginContainer logger={logger} />
              )}
              {outOfContentsContainer}
            </MainContainer>
          </Layout.Left>
        </Layout.Top>
        <_PortalsManager />
      </Layout.Bottom>
    </RootElement>
  );
}

const outOfContentsContainer = (
  <div
    style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'none',
    }}>
    <div
      id="flipper-out-of-contents-container"
      style={{
        display: 'none',
        position: 'absolute',
        right: 0,
        bottom: 0,
        left: 0,
        top: 0,
      }}
    />
  </div>
);

const MainContainer = styled(Layout.Container)({
  background: theme.backgroundWash,
  overflow: 'hidden',
});

const RootElement = styled.div({
  display: 'flex',
  height: '100%',
  background: theme.backgroundWash,
});
RootElement.displayName = 'SandyAppRootElement';

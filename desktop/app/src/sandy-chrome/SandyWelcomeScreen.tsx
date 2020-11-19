/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {BugOutlined, SettingOutlined} from '@ant-design/icons';
import {Modal, Button, Checkbox, Typography} from 'antd';
import React, {useState} from 'react';
import constants from '../fb-stubs/constants';
import {NUX, Layout, theme} from 'flipper-plugin';
import {useLocalStorage} from '../utils/useLocalStorage';

const {Title, Text, Link} = Typography;

export function SandyWelcomScreen() {
  const [dismissed, setDismissed] = useState(false);
  const [showWelcomeScreen, setShowWelcomeScreen] = useLocalStorage(
    'flipper-sandy-show-welcome-screen',
    true,
  );
  const [dontShowNextTime, setDontShowNextTime] = useState(true);
  return (
    <Modal
      closable={true}
      visible={!dismissed && showWelcomeScreen}
      onCancel={() => {
        setDismissed(true);
      }}
      footer={
        <>
          <Checkbox
            checked={dontShowNextTime}
            onChange={(e) => {
              setDontShowNextTime(e.target.value);
            }}>
            Don't show this dialog in the future
          </Checkbox>
          <Button
            onClick={() => {
              setDismissed(true);
              setShowWelcomeScreen(!dontShowNextTime);
            }}>
            Dismiss
          </Button>
        </>
      }>
      <Layout.Container gap={theme.space.large}>
        <Title>Welcome to the new Flipper design</Title>
        <Text>
          Flipper has a fresh look and feel! It should provide a smoother, more
          intuitive experience. So make sure to check out the{' '}
          <NUX
            title="Lightbulbs provide hints about certain UI elements."
            placement="bottom">
            <Button disabled size="small">
              lightbulbs
            </Button>
          </NUX>{' '}
          to find new or improved features.
        </Text>
        <Text>
          It is possible to enable the experimental dark mode, or switch back to
          the old design, by using the{' '}
          <Button icon={<SettingOutlined />} disabled size="small" /> settings
          button.{' '}
          {constants.IS_PUBLIC_BUILD ? (
            <>
              Feel free let us know your thoughts about the new experience on{' '}
              <Link href="https://github.com/facebook/flipper/issues/new/choose">
                GitHub
              </Link>
              !
            </>
          ) : (
            <>
              Feel free let us know your thoughts about the new experience on{' '}
              <Link href="https://www.internalfb.com/papercuts?application=flipper">
                Papercuts
              </Link>{' '}
              or by using the{' '}
              <Button icon={<BugOutlined />} disabled size="small" /> Feedback
              button!
            </>
          )}
        </Text>
        <Text>
          For plugin developers, the new design means that the full{' '}
          <Link href="https://ant.design/components/overview/">
            Ant Design Component Library
          </Link>{' '}
          is available to write beautiful plugins. Check our{' '}
          <Link href="https://fbflipper.com/docs/tutorial/intro">guide</Link> on
          how to write plugins.
        </Text>
      </Layout.Container>
    </Modal>
  );
}

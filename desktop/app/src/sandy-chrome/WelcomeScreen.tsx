/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {cloneElement} from 'react';
import {styled, FlexRow, FlexColumn} from '../ui';
import {Modal, Button, Image, Checkbox, Space, Typography} from 'antd';
import {
  RocketOutlined,
  AppstoreAddOutlined,
  CodeOutlined,
  BugOutlined,
} from '@ant-design/icons';
import {Layout, theme, Tracked, TrackingScope} from 'flipper-plugin';

const {Text, Title} = Typography;

import constants from '../fb-stubs/constants';
import isProduction from '../utils/isProduction';
import {getAppVersion} from '../utils/info';
import {getFlipperLib} from 'flipper-plugin';

const RowContainer = styled(FlexRow)({
  alignItems: 'flex-start',
  padding: `${theme.space.small}px`,
  cursor: 'pointer',
  '&:hover, &:focus, &:active': {
    backgroundColor: theme.backgroundTransparentHover,
    borderRadius: theme.borderRadius,
    textDecoration: 'none',
  },
});

function Row(props: {
  icon: React.ReactElement;
  title: string;
  subtitle: string;
  onClick?: () => void;
}) {
  return (
    <Tracked action={props.title}>
      <RowContainer onClick={props.onClick}>
        <Space size="middle">
          {cloneElement(props.icon, {
            style: {fontSize: 36, color: theme.primaryColor},
          })}
          <FlexColumn>
            <Title level={3} style={{color: theme.primaryColor}}>
              {props.title}
            </Title>
            <Text type="secondary">{props.subtitle}</Text>
          </FlexColumn>
        </Space>
      </RowContainer>
    </Tracked>
  );
}

const FooterContainer = styled(FlexRow)({
  justifyContent: 'space-between',
  alignItems: 'center',
});

function WelcomeFooter({
  onClose,
  checked,
  onCheck,
}: {
  onClose: () => void;
  checked: boolean;
  onCheck: (value: boolean) => void;
}) {
  return (
    <FooterContainer>
      <Checkbox checked={checked} onChange={(e) => onCheck(e.target.checked)}>
        <Text style={{fontSize: theme.fontSize.small}}>
          Show this when app opens (or use ? icon on left)
        </Text>
      </Checkbox>
      <Button type="primary" onClick={onClose}>
        Close
      </Button>
    </FooterContainer>
  );
}

const openExternal = (url: string) => () => getFlipperLib().openLink(url);

export default function WelcomeScreen({
  visible,
  onClose,
  showAtStartup,
  onCheck,
}: {
  visible: boolean;
  onClose: () => void;
  showAtStartup: boolean;
  onCheck: (value: boolean) => void;
}) {
  return (
    <Modal
      closable={false}
      visible={visible}
      footer={
        <WelcomeFooter
          onClose={onClose}
          checked={showAtStartup}
          onCheck={onCheck}
        />
      }
      onCancel={onClose}>
      <WelcomeScreenContent />
    </Modal>
  );
}

export function WelcomeScreenStaticView() {
  return (
    <Layout.Container
      center
      style={{
        justifyContent: 'center',
      }}
      pad
      grow>
      <Layout.Container width={400} center>
        <WelcomeScreenContent />
      </Layout.Container>
    </Layout.Container>
  );
}

function WelcomeScreenContent() {
  return (
    <TrackingScope scope="welcomescreen">
      <Space
        direction="vertical"
        size="middle"
        style={{width: '100%', padding: '0 32px 32px', alignItems: 'center'}}>
        <Image width={125} height={125} src="./icon.png" preview={false} />
        <Title level={1}>Welcome to Flipper</Title>
        <Text style={{color: theme.textColorPlaceholder}}>
          {isProduction() ? `Version ${getAppVersion()}` : 'Development Mode'}
        </Text>
      </Space>
      <Space direction="vertical" size="large" style={{width: '100%'}}>
        <Row
          icon={<RocketOutlined />}
          title="Using Flipper"
          subtitle="Learn how Flipper can help you debug your App"
          onClick={openExternal('https://fbflipper.com/docs/features/index')}
        />
        <Row
          icon={<AppstoreAddOutlined />}
          title="Create Your Own Plugin"
          subtitle="Get started with these pointers"
          onClick={openExternal('https://fbflipper.com/docs/tutorial/intro')}
        />
        <Row
          icon={<CodeOutlined />}
          title="Add Flipper Support to Your App"
          subtitle="Get started with these pointers"
          onClick={openExternal(
            'https://fbflipper.com/docs/getting-started/index',
          )}
        />
        <Row
          icon={<BugOutlined />}
          title="Contributing and Feedback"
          subtitle="Report issues and help us improve Flipper"
          onClick={openExternal(constants.FEEDBACK_GROUP_LINK)}
        />
      </Space>
    </TrackingScope>
  );
}

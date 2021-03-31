/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Typography, Button, Space, Input, Card, Alert, List} from 'antd';
import {Layout} from '../ui';
import {theme} from 'flipper-plugin';
import {css} from '@emotion/css';
import {DesignComponentDemos} from './DesignComponentDemos';

const {Title, Text, Link} = Typography;

export default function SandyDesignSystem() {
  return (
    <Layout.ScrollContainer className={reset}>
      <Layout.Container gap="large">
        <Card title="Flipper Design System" bordered={false}>
          <p>
            Welcome to the Flipper Design System. The Flipper design system is
            based on{' '}
            <Link href="https://ant.design/components/overview/">
              Ant Design
            </Link>
            . Any component found in the ANT documentation can be used. This
            page demonstrates the usage of:
          </p>
          <ul>
            <li>Colors</li>
            <li>Typography</li>
            <li>Theme Variables</li>
            <li>Layout components</li>
          </ul>
          <p>
            The following components from Ant should <em>not</em> be used:
          </p>
          <ul>
            <li>
              <code>Layout</code>: use Flipper's <code>Layout.*</code> instead.
            </li>
          </ul>
          <p>Sandy guidelines</p>
          <ul>
            <li>
              Avoid using `margin` properties, use padding on the container
              indeed, or <code>gap</code> in combination with{' '}
              <code>Layout.Horizontal|Vertical</code>
            </li>
            <li>
              Avoid using <code>width / height: 100%</code>, use{' '}
              <code>Layout.Container</code> instead.
            </li>
          </ul>
        </Card>
        <Card title="Colors" bordered={false}>
          <Alert message="The following colors are available on the <code>theme</code> object. Please stick to this color palette, as these colors will be translated to dark mode correctly." />
          <ColorPreview name="primaryColor" />
          <ColorPreview name="successColor" />
          <ColorPreview name="errorColor" />
          <ColorPreview name="warningColor" />
          <ColorPreview name="textColorPrimary" />
          <ColorPreview name="textColorSecondary" />
          <ColorPreview name="textColorPlaceholder" />
          <ColorPreview name="textColorActive" />
          <ColorPreview name="disabledColor" />
          <ColorPreview name="backgroundDefault" />
          <ColorPreview name="backgroundWash" />
          <ColorPreview name="buttonDefaultBackground" />
          <ColorPreview name="backgroundTransparentHover" />
          <ColorPreview name="dividerColor" />
        </Card>
        <Card title="Typography" bordered={false}>
          <Space direction="vertical">
            <Alert
              message={
                <>
                  Common Ant components, with modifiers applied. The{' '}
                  <code>Title</code>, <code>Text</code> and <code>Link</code>{' '}
                  components can be found by importing the{' '}
                  <code>Typography</code> namespace from Ant.
                </>
              }
              type="info"
            />
            <Title>Title</Title>
            <Title level={2}>Title level=2</Title>
            <Title level={3}>Title level=3</Title>
            <Title level={4}>Title level=4</Title>
            <Text>Text</Text>
            <Text type="secondary">Text - type=secondary</Text>
            <Text type="success">Text - type=success</Text>
            <Text type="warning">Text - type=warning</Text>
            <Text type="danger">Text - danger</Text>
            <Text disabled>Text - disbled </Text>
            <Text strong>Text - strong</Text>
            <Text code>Text - code</Text>
            <Link href="https://fbflipper.com/">Link</Link>
            <Link type="secondary" href="https://fbflipper.com/">
              Link - type=secondary
            </Link>
            <Button>Button</Button>
            <Button size="small">Button - size=small</Button>
            <Input placeholder="Input" />
          </Space>
        </Card>
        <Card title="Theme variables" bordered={false}>
          <Alert
            message={
              <>
                The following theme veriables are exposed from the Flipper{' '}
                <code>theme</code> object. See the colors section above for a
                preview of the colors.
              </>
            }
          />
          <pre>{JSON.stringify(theme, null, 2)}</pre>
        </Card>
        <Card title="Layout components" bordered={false}>
          <DesignComponentDemos />
        </Card>
      </Layout.Container>
    </Layout.ScrollContainer>
  );
}

function ColorPreview({name}: {name: keyof typeof theme}) {
  return (
    <List.Item>
      <List.Item.Meta
        avatar={
          <div
            style={{
              background: theme[name] as any,
              width: 24,
              height: 24,
              borderRadius: theme.borderRadius,
            }}
          />
        }
        title={`theme.${name}`}
      />
    </List.Item>
  );
}

const reset = css`
  ol,
  ul {
    list-style: revert;
    margin-left: ${theme.space.huge}px;
  }
  .ant-alert {
    margin-bottom: ${theme.space.huge}px;
  }
  .ant-card {
    background: transparent;
  }
`;

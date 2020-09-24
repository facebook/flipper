/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Typography, Button, Space, Input} from 'antd';
// import {styled, FlexColumn} from 'flipper';

const {Title, Text, Link} = Typography;

// const Container = styled(FlexColumn)({});

export default function TypographyExample() {
  return (
    <Space>
      <Space direction="vertical">
        <Title>h1. Headline</Title>
        <Title level={2}>h2. Headline</Title>
        <Title level={3}>h3. Headline</Title>
        <Title level={4}>h4. Headline</Title>
        <Text>Body - Regular</Text>
        <Text strong>Body - Strong</Text>
        <Button type="text" size="middle">
          Button
        </Button>
        <Button type="text" size="small">
          Button small
        </Button>
        <Text code>Code</Text>
      </Space>
      <Space direction="vertical">
        <Text>Primary</Text>
        <Text type="secondary">Secondary</Text>
        <Input placeholder="Placeholder" />
        <Text disabled>Disabled</Text>
        <Text type="success">Positive</Text>
        <Text type="warning">Warning</Text>
        <Text type="danger">Danger</Text>
        <Link href="https://fbflipper.com/" target="_blank">
          Link
        </Link>
        <Link type="secondary" href="https://fbflipper.com/" target="_blank">
          Link Secondary
        </Link>
      </Space>
    </Space>
  );
}

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Typography, Card, Table, Collapse, Button, Tabs} from 'antd';
import {Layout} from '../ui';
import {theme} from './theme';
import reactElementToJSXString from 'react-element-to-jsx-string';
import {CodeOutlined} from '@ant-design/icons';

const {Text} = Typography;

const demoStyle: Record<string, React.CSSProperties> = {
  square: {
    background: theme.successColor,
    width: 50,
    height: 50,
    lineHeight: '50px',
    textAlign: 'center',
  },
  border: {border: `1px dotted ${theme.primaryColor}`},
} as const;

type PreviewProps = {
  title: string;
  description?: string;
  props: [string, string, string][];
  demos: Record<string, React.ReactNode>;
};

const largeChild = (
  <div style={{background: theme.warningColor}}>
    <img src="https://fbflipper.com/img/mascot.png" height={500} />
  </div>
);
const aButton = <Button>A button</Button>;
const aBox = <div style={{...demoStyle.square, width: 100}}>A fixed child</div>;
const aFixedWidthBox = (
  <div style={{background: theme.primaryColor, width: 150, color: 'white'}}>
    Fixed width box
  </div>
);
const aFixedHeightBox = (
  <div
    style={{
      background: theme.primaryColor,
      height: 40,
      lineHeight: '40px',
      color: 'white',
    }}>
    Fixed height box
  </div>
);
const aDynamicBox = (
  <div style={{background: theme.warningColor, flex: 1}}>
    A dynamic child (flex: 1)
  </div>
);
const someText = <Text>Some text</Text>;

const demos: PreviewProps[] = [
  {
    title: 'Layout.Container',
    description:
      'Layout.Container can be used to organize the UI in regions. It takes care of paddings and borders. To arrange multiple children use one of the other Layout components. If you need a margin on this component, try to wrap it in other Layout component instead.',
    props: [
      ['rounded', 'boolean (false)', 'Make the corners rounded'],
      [
        'padv / padh / pad',
        Object.keys(theme.space).join(' | ') + ' | number | true',
        'Short-hand to set the horizontal, vertical or both paddings. The keys correspond to the theme space settings. Using `true` picks the default horizontal / vertical padding for inline elements.',
      ],
      [
        'width / height',
        'number',
        'Set the width / height of this container in pixels. Use sparingly.',
      ],
      [
        'bordered',
        'boolean (false)',
        'This container will use a default border on all sides',
      ],
      [
        'borderTop / borderRight / borderBottom / borderLeft',
        'boolean (false)',
        'Use a standard padding on the top side',
      ],
    ],
    demos: {
      'Basic container with fixed dimensions': (
        <Layout.Container style={demoStyle.square}></Layout.Container>
      ),
      'Basic container with fixed height': (
        <Layout.Container
          style={{
            height: 50,
            background: theme.successColor,
          }}></Layout.Container>
      ),
      'bordered pad rounded': (
        <Layout.Container
          bordered
          pad
          rounded
          style={{background: theme.backgroundDefault, width: 200}}>
          <div style={demoStyle.square}>child</div>
        </Layout.Container>
      ),
    },
  },
  {
    title: 'Layout.ScrollContainer',
    description:
      'Use this component to create an area that can be scrolled. The scrollable area will automatically consume all available space. ScrollContainer accepts all properties that Container accepts as well. Padding will be applied to the child rather than the parent.',
    props: [
      [
        'horizontal / vertical',
        'boolean',
        'specifies in which directions the container should scroll. If none is specified the container will scroll in both directions',
      ],
    ],
    demos: {
      'Basic usage': (
        <Layout.ScrollContainer style={{height: 100}}>
          {largeChild}
        </Layout.ScrollContainer>
      ),
      'ScrollContainer + Vertical for vertical scroll only': (
        <Layout.ScrollContainer
          vertical
          style={{
            height: 100,
            width: 100,
            border: `2px solid ${theme.primaryColor}`,
          }}>
          <Layout.Vertical>
            <Text ellipsis>
              This text is truncated because it is too long and scroll is
              vertical only...
            </Text>
            {largeChild}
          </Layout.Vertical>
        </Layout.ScrollContainer>
      ),
    },
  },
  {
    title: 'Layout.Horizontal',
    description:
      'Use this component to arrange multiple items horizontally. All vanilla Container props can be used as well.',
    props: [
      [
        'gap',
        Object.keys(theme.space).join(' | ') + ' | number | true',
        'Set the spacing between children. For `true` theme.space.small should be used. Defaults to 0.',
      ],
      [
        'center',
        'boolean (false)',
        'If set, all children will use their own height, and they will be centered vertically in the layout. If not set, all children will be stretched to the height of the layout.',
      ],
    ],
    demos: {
      'Basic usage, gap="large"': (
        <Layout.Horizontal gap="large">
          {aButton}
          {someText}
          {aBox}
          {aDynamicBox}
        </Layout.Horizontal>
      ),
      'Using flags: pad center gap={8} (great for toolbars and such)': (
        <Layout.Horizontal pad center gap={8}>
          {aButton}
          {someText}
          {aBox}
          {aDynamicBox}
        </Layout.Horizontal>
      ),
    },
  },
  {
    title: 'Layout.Vertical',
    description:
      'Use this component to arrange multiple items vertically. All vanilla Container props can be used as well.',
    props: [
      [
        'gap',
        'number (0)',
        'Set the spacing between children. Typically theme.space.small should be used.',
      ],
      [
        'center',
        'boolean (false)',
        'If set, all children will use their own height, and they will be centered vertically in the layout. If not set, all children will be stretched to the height of the layout.',
      ],
    ],
    demos: {
      'Basic usage, gap={24}': (
        <Layout.Vertical gap={24}>
          {aButton}
          {someText}
          {aBox}
          {aDynamicBox}
        </Layout.Vertical>
      ),
      'Using flags: pad center gap (great for toolbars and such)': (
        <Layout.Vertical pad center gap>
          {aButton}
          {someText}
          {aBox}
          {aDynamicBox}
        </Layout.Vertical>
      ),
    },
  },
  {
    title: 'Layout.Top|Left|Right|Bottom',
    description:
      "Divides all available space over two children. The (top|left|right|bottom)-most first child will keep it's own dimensions, and positioned (top|left|right|bottom) of the other child. All remaining space will be assigned to the remaining child.",
    props: [
      [
        'scrollable',
        'boolean (false)',
        'If set, the area of the second child will automatically be made scrollable.',
      ],
      [
        'center',
        'boolean (false)',
        'If set, all children will use their own height, and they will be centered vertically in the layout. If not set, all children will be stretched to the height of the layout.',
      ],
    ],
    demos: {
      'Layout.Top': (
        <Layout.Top>
          {aFixedHeightBox}
          {aDynamicBox}
        </Layout.Top>
      ),
      'Layout.Left': (
        <Layout.Left>
          {aFixedWidthBox}
          {aDynamicBox}
        </Layout.Left>
      ),
      'Layout.Right': (
        <Layout.Right>
          {aDynamicBox}
          {aFixedWidthBox}
        </Layout.Right>
      ),
      'Layout.Bottom': (
        <Layout.Bottom>
          {aDynamicBox}
          {aFixedHeightBox}
        </Layout.Bottom>
      ),
      'Layout.Top + scrollable': (
        <Layout.Container style={{height: 150}}>
          <Layout.Top scrollable>
            {aFixedHeightBox}
            {largeChild}
          </Layout.Top>
        </Layout.Container>
      ),
      'Layout.Left + scrollable': (
        <Layout.Container style={{height: 150}}>
          <Layout.Left scrollable>
            {aFixedWidthBox}
            {largeChild}
          </Layout.Left>
        </Layout.Container>
      ),
      'Layout.Right + scrollable': (
        <Layout.Container style={{height: 150}}>
          <Layout.Right scrollable>
            {largeChild}
            {aFixedWidthBox}
          </Layout.Right>
        </Layout.Container>
      ),
      'Layout.Bottom + scrollable': (
        <Layout.Container style={{height: 150}}>
          <Layout.Bottom scrollable>
            {largeChild}
            {aFixedHeightBox}
          </Layout.Bottom>
        </Layout.Container>
      ),
    },
  },
];

function ComponentPreview({title, demos, description, props}: PreviewProps) {
  return (
    <Card title={title} size="small" type="inner">
      <Layout.Vertical gap="small">
        <Text type="secondary">{description}</Text>
        <Collapse ghost>
          <Collapse.Panel header="Examples" key="demos">
            <Layout.Vertical gap="large">
              {Object.entries(demos).map(([name, children]) => (
                <div key={name}>
                  <Tabs type="line">
                    <Tabs.TabPane tab={name} key="1">
                      <div
                        style={{
                          background: theme.backgroundWash,
                          width: '100%',
                        }}>
                        {children}
                      </div>
                    </Tabs.TabPane>
                    <Tabs.TabPane tab={<CodeOutlined />} key="2">
                      <div
                        style={{
                          background: theme.backgroundWash,
                          width: '100%',
                          padding: theme.space.medium,
                        }}>
                        <pre>{reactElementToJSXString(children)}</pre>
                      </div>
                    </Tabs.TabPane>
                  </Tabs>
                </div>
              ))}
            </Layout.Vertical>
          </Collapse.Panel>
          <Collapse.Panel header="Props" key="props">
            <Table
              size="small"
              pagination={false}
              dataSource={props.map((prop) =>
                Object.assign(prop, {key: prop[0]}),
              )}
              columns={[
                {
                  title: 'Property',
                  dataIndex: 0,
                  width: 100,
                },
                {
                  title: 'Type and default',
                  dataIndex: 1,
                  width: 200,
                },
                {
                  title: 'Description',
                  dataIndex: 2,
                },
              ]}
            />
          </Collapse.Panel>
        </Collapse>
      </Layout.Vertical>
    </Card>
  );
}

export const DesignComponentDemos = () => (
  <Layout.Vertical gap={theme.space.large}>
    {demos.map((demo) => (
      <ComponentPreview key={demo.title} {...demo} />
    ))}
  </Layout.Vertical>
);

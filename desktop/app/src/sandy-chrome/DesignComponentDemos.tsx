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
        'padded',
        'boolean (false)',
        'Use a standard small padding for this container (use `padding` for non-default padding)',
      ],
      [
        'padding',
        'CSS Padding',
        'Short-hand to set the style.padding property',
      ],
      [
        'bordered',
        'boolean (false)',
        'This container will use a default border on all sides',
      ],
      [
        'borderTop',
        'boolean (false)',
        'Use a standard padding on the top side',
      ],
      [
        'borderRight',
        'boolean (false)',
        'Use a standard padding on the right side',
      ],
      [
        'borderBottom',
        'boolean (false)',
        'Use a standard padding on the bottom side',
      ],
      [
        'borderLeft',
        'boolean (false)',
        'Use a standard padding on the left side',
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
      'bordered padded rounded': (
        <Layout.Container
          bordered
          padded
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
    props: [],
    demos: {
      'Basic usage': (
        <Layout.ScrollContainer style={{height: 100}}>
          {largeChild}
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
        <Layout.Horizontal gap={24}>
          {aButton}
          {someText}
          {aBox}
          {aDynamicBox}
        </Layout.Horizontal>
      ),
      'Using flags: padded center gap={8} (great for toolbars and such)': (
        <Layout.Horizontal padded center gap={8}>
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
      'Using flags: padded center gap={8} (great for toolbars and such)': (
        <Layout.Vertical padded center gap={8}>
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
      <Layout.Vertical gap={theme.space.small}>
        <Text type="secondary">{description}</Text>
        <Collapse ghost>
          <Collapse.Panel header="Examples" key="demos">
            <Layout.Vertical gap={theme.space.large}>
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

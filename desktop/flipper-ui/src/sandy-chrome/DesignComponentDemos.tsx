/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Typography, Card, Table, Collapse, Button} from 'antd';
import {Layout, Link} from '../ui';
import {
  NUX,
  Panel,
  theme,
  Tracked,
  TrackingScope,
  Tabs,
  Tab,
} from 'flipper-plugin';
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
  description?: React.ReactNode;
  props: [string, React.ReactNode, React.ReactNode][];
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
    description: `Layout.Container can be used to organize the UI in regions. It takes care of paddings and borders. Children will be arranged vertically. Use Layout.Horizontal instead for arranging children horizontally. If you need a margin on this component, try to wrap it in other Layout component instead.`,
    props: [
      [
        'grow',
        'boolean (false)',
        "Should the container use all available size (true), or rather take the size of it's content? (false).",
      ],
      [
        'shrink',
        'boolean (false)',
        'Is the container allowed to become smaller than the space the children need? If e.g. text content needs to be ellipsed, this should be set to true',
      ],
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
      [
        'gap',
        'true / number (0)',
        'Set the spacing between children. If just set, theme.space.small will be used.',
      ],
      [
        'center',
        'boolean (false)',
        'If set, all children will use their own naturally width, and they will be centered horizontally in the Container. If not set, all children will be stretched to the width of the Container.',
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
      'Multiple children, gap={24}': (
        <Layout.Container gap={24}>
          {aButton}
          {someText}
          {aBox}
          {aDynamicBox}
        </Layout.Container>
      ),
      'Multiple children icmw. pad center gap': (
        <Layout.Container pad center gap>
          {aButton}
          {someText}
          {aBox}
          {aDynamicBox}
        </Layout.Container>
      ),
    },
  },
  {
    title: 'Layout.Horizontal',
    description:
      'Use this component to arrange multiple items horizontally. All vanilla Container props can be used as well.',
    props: [
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
    title: 'Layout.ScrollContainer',
    description:
      'Use this component to create an area that can be scrolled. The scrollable area will automatically consume all available space. ScrollContainer accepts all properties that Container accepts as well. Padding will be applied to the child rather than the parent.',
    props: [
      [
        'horizontal / vertical',
        'boolean',
        'specifies in which directions the container should scroll. If none is specified the container will scroll in both directions',
      ],
      [
        'padv / padh / pad',
        'see Container',
        'Padding will be applied to the child',
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
          <Layout.Container>
            <Text ellipsis>
              This text is truncated because it is too long and scroll is
              vertical only...
            </Text>
            {largeChild}
          </Layout.Container>
        </Layout.ScrollContainer>
      ),
    },
  },
  {
    title: 'Layout.Top|Left|Right|Bottom',
    description:
      "Divides all available space over two children. The (top|left|right|bottom)-most first child will keep it's own dimensions, and positioned (top|left|right|bottom) of the other child. All remaining space will be assigned to the remaining child. If you are using a Layout.Right at the top level of your plugin, consider using DetailSidebar component instead, which will move its children to the right sidebar of Flipper.",
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
      [
        'gap',
        'true / number (0)',
        'Set the spacing between children. If just set, theme.space.small will be used.',
      ],
      [
        'resizable',
        'true / undefined',
        'If set, this split container will be resizable by the user. It is recommend to set width, maxWidth, minWidth respectively height, maxHeight, minHeight properties as well.',
      ],
      [
        'width / height / minWidth  / minHeight / maxWidth / maxHeight',
        'number / undefined',
        'These dimensions in pixels will be used for clamping if the layout is marked as resizable',
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
      'Layout.Top + Layout.ScrollContainer': (
        <Layout.Container style={{height: 150}}>
          <Layout.Top>
            {aFixedHeightBox}
            <Layout.ScrollContainer>{largeChild}</Layout.ScrollContainer>
          </Layout.Top>
        </Layout.Container>
      ),
      'Layout.Left + Layout.ScrollContainer': (
        <Layout.Container style={{height: 150}}>
          <Layout.Left>
            {aFixedWidthBox}
            <Layout.ScrollContainer>{largeChild}</Layout.ScrollContainer>
          </Layout.Left>
        </Layout.Container>
      ),
      'Layout.Right resizable + Layout.ScrollContainer': (
        <Layout.Container style={{height: 150}}>
          <Layout.Right resizable>
            <Layout.ScrollContainer>{largeChild}</Layout.ScrollContainer>
            {aDynamicBox}
          </Layout.Right>
        </Layout.Container>
      ),
      'Layout.Bottom resizable + Layout.ScrollContainer': (
        <Layout.Container style={{height: 150}}>
          <Layout.Bottom resizable height={50} minHeight={20}>
            <Layout.ScrollContainer>{largeChild}</Layout.ScrollContainer>
            {aDynamicBox}
          </Layout.Bottom>
        </Layout.Container>
      ),
    },
  },
  {
    title: 'Panel',
    description:
      'A collapsible UI region. The collapsed state of the pane will automatically be persisted so that the collapsed state is restored the next time user visits the plugin again. Note that the children of a Panel should have some size, either a fixed or a natural size. Elements that grow to their parent size will become invisible.',
    props: [
      ['title', 'string', 'Title of the pane'],
      [
        'collapsible',
        'boolean (true)',
        "If set to false it won't be possible to collapse the panel",
      ],
      [
        'collapsed',
        'boolean (false)',
        'The initial collapsed state of the panel.',
      ],
      [
        'pad / gap',
        'boolean / number (false)',
        'See the pad property of Layout.Container, determines whether the pane contents will have some padding and space between the items. By default no padding / gap is applied.',
      ],
    ],
    demos: {
      'Two panels in a fixed height container': (
        <Layout.Container>
          <Panel title="Panel 1">Some content</Panel>
          <Panel title="Panel 2 (collapsed)" collapsed>
            {aFixedHeightBox}
          </Panel>
          <Panel
            title="Panel 3 (not collapsible, pad, gap)"
            collapsible={false}
            pad
            gap>
            {aFixedHeightBox}
            {aFixedHeightBox}
          </Panel>
        </Layout.Container>
      ),
    },
  },
  {
    title: 'Tabs / Tab',
    description:
      "Tabs represents a tab control and all it's children should be Tab components. By default the Tab control uses all available space, but set grow=false to only use the minimally required space",
    props: [
      [
        'grow (Tabs)',
        'boolean (true)',
        'If true, the tab control will grow all tabs to the maximum available vertical space. If false, only the minimal required (natural) vertical space will be used',
      ],
      [
        'pad / gap (Tab)',
        'boolean / number (false)',
        'See the pad property of Layout.Container, determines whether the pane contents will have some padding and space between the items. By default no padding / gap is applied.',
      ],
      [
        'other props',
        '',
        'This component wraps Tabs from ant design, see https://ant.design/components/tabs/ for more details',
      ],
    ],
    demos: {
      'Two tabs': (
        <Layout.Container height={200}>
          <Tabs>
            <Tab tab="Pane 1">{aDynamicBox}</Tab>
            <Tab tab="Pane 2 pad gap" pad gap>
              {aFixedHeightBox}
              {aFixedHeightBox}
            </Tab>
          </Tabs>
        </Layout.Container>
      ),
      'Two tabs (no grow)': (
        <Layout.Container grow={false}>
          <Tabs>
            <Tab tab="Pane 1">{aDynamicBox}</Tab>
            <Tab tab="Pane 2 pad gap" pad gap>
              {aFixedHeightBox}
              {aFixedHeightBox}
            </Tab>
          </Tabs>
        </Layout.Container>
      ),
    },
  },
  {
    title: 'NUX',
    description:
      'A component to provide a New-User-eXperience: Highlight new features to first time users. For tooltips that should stay available, use ToolTip from ANT design',
    props: [
      ['title', 'string / React element', 'The tooltip contents'],
      [
        'placement',
        <>
          See{' '}
          <Link href="https://ant.design/components/tooltip/#components-tooltip-demo-placement">
            docs
          </Link>
        </>,
        '(optional) on which side to place the tooltip',
      ],
    ],
    demos: {
      'NUX example': (
        <NUX title="This button does something cool" placement="right">
          <Button>Hello world</Button>
        </NUX>
      ),
    },
  },
  {
    title: 'Tracked',
    description:
      'A component that tracks component interactions. For Facebook internal builds, global stats for these interactions will be tracked. Wrap this component around another element to track its events',
    props: [
      [
        'events',
        'string | string[] (default: "onClick")',
        'The event(s) of the child component that should be tracked',
      ],
      [
        'action',
        'string (optional)',
        'Describes the element the user interacted with. Will by default be derived from the title, key or contents of the element',
      ],
    ],
    demos: {
      'Basic example': (
        <Tracked>
          <Button onClick={() => {}}>Test</Button>
        </Tracked>
      ),
    },
  },
  {
    title: 'TrackingScope',
    description:
      'Describes more precisely the place in the UI for all underlying Tracked elements. Multiple Tracking scopes are automatically nested. Use the `withTrackingScope` HoC to automatically wrap a component definition in a tracking scope',
    props: [
      ['scope', 'string', 'The name of the scope. For example "Login Dialog"'],
    ],
    demos: {
      'Basic example': (
        <TrackingScope scope="tracking scope demo">
          <Tracked>
            <Button onClick={() => {}}>Test</Button>
          </Tracked>
        </TrackingScope>
      ),
    },
  },
];

function ComponentPreview({title, demos, description, props}: PreviewProps) {
  return (
    <Card title={title} size="small" type="inner">
      <TrackingScope scope={title}>
        <Layout.Container gap="small">
          <Text type="secondary">{description}</Text>
          <Collapse ghost>
            <Collapse.Panel header="Examples" key="demos">
              <Layout.Container gap="large">
                {Object.entries(demos).map(([name, children]) => (
                  <Tabs type="line" key={name}>
                    <Tab tab={name} key="1">
                      <div
                        style={{
                          background: theme.backgroundWash,
                          width: '100%',
                        }}>
                        {children}
                      </div>
                    </Tab>
                    <Tab tab={<CodeOutlined />} key="2">
                      <div
                        style={{
                          background: theme.backgroundWash,
                          width: '100%',
                          padding: theme.space.medium,
                        }}>
                        <pre>{reactElementToJSXString(children)}</pre>
                      </div>
                    </Tab>
                  </Tabs>
                ))}
              </Layout.Container>
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
        </Layout.Container>
      </TrackingScope>
    </Card>
  );
}

export const DesignComponentDemos = () => (
  <Layout.Container gap={theme.space.large}>
    {demos.map((demo) => (
      <ComponentPreview key={demo.title} {...demo} />
    ))}
  </Layout.Container>
);

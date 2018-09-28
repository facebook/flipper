---
id: ui-components
title: UI Components
sidebar_label: UI Components
---

Flipper has a lot of built in React components to build UIs. You can find all of these in [`src/ui/components`](https://github.com/facebook/Flipper/tree/master/src/ui/components) and can import them directly using `import {Button} from 'flipper'`.

## FlexBox

In Flipper we make heavy use of flexbox for layout. FlexBox is layout system on the web which has been specifically design for building application like UIs. Flipper provides two flexbox components `FlexRow` and `FlexColumn`. These are flexbox components with some sane defaults such as automatically scrolling content that overflows.

```javascript
import { FlexRow, FlexColumn } from 'flipper';

// Align children horizontally
<FlexRow>
  {children}
</FlexRow>

// Align children vertically
<FlexColumn>
  {children}
</FlexColumn>
```

To control other flexbox properties than the direction you can extend existing components, detailed in [Styling Components](styling-components.md).

```javascript
import {FlexRow, styled} from 'flipper';

const CenterFlexRow = styled(FlexRow)({
  justifyContent: 'center',
});

// Align children horizontally in the center
<CenterFlexRow>{children}</CenterFlexRow>;
```

## Text

The `Text` component is available to render any text in your plugin. To render headers and subtitle differently for example, we used the styled module. With this we can also change the color, text alignment, and any other properties typically found on a `span`.

```javascript
import {Text, styled, colors} from 'flipper';

const Title = styled(Text)({
  color: colors.red,
});

<Title code={true}>Flipper Subtitle</Title>;
```

## Buttons

Flipper comes with a couple of button styles built in! As always you can style then further using the styled module but we expect the pre-defined buttons to fit most UIs.

```javascript
import {Button} from 'flipper';

<Button onClick={this.onClick} icon="airport" compact={true}>
  Click Me!
</Button>;
```

You can create a group of buttons by surrounding it with `<ButtonGroup>`.

## Sidebar

The `Sidebar` component provides a nice abstraction around some common but complex behavior. The `Sidebar` is used by all major Flipper plugins and using it in your plugin will ensure your plugin behaves similarly, such as allowing for resizing.

```javascript
import {FlexRow, Sidebar, colors, styled} from 'infinity-ui';
import {FlipperPlugin} from 'flipper';

type State = {};

const Red = styled('div')({
  backgroundColor: colors.red,
});

const Blue = styled('div')({
  backgroundColor: colors.blue,
});

export default class MyFlipperPlugin extends FlipperPlugin<State> {
  static title = 'My Plugin';
  static id = 'my-plugin';

  render() {
    return (
      <FlexRow fill={true}>
        <Red fill={true} />

        <Sidebar position="right" width={400} minWidth={300}>
          <Blue fill={true} />
        </Sidebar>
      </FlexRow>
    );
  }
}
```

## Panel

Panels are a way to section data, and make it collapsible. They are often used in sidebars. Just give the Panel a heading and some content and it makes sure that it displays in the same style as the rest of Flipper.

```javascript
import {
  FlexColumn,
  FlexRow,
  Sidebar,
  Panel,
  colors,
  styled,
  FlipperPlugin,
} from 'flipper';

type State = {};

const Red = styled('div')({
  backgroundColor: colors.red,
});

const Blue = styled('div')({
  backgroundColor: colors.blue,
  height: 200,
});

const Green = styled('div')({
  backgroundColor: colors.green,
  height: 200,
});

export default class MyFlipperPlugin extends FlipperPlugin<State> {
  static title = 'My Plugin';
  static id = 'my-plugin';

  render() {
    return (
      <FlexRow fill={true}>
        <Red fill={true} />

        <Sidebar position="right" width={400} minWidth={300}>
          <FlexColumn>
            <Panel heading={'Blue'} floating={false}>
              <Blue />
            </Panel>

            <Panel heading={'Green'} floating={false}>
              <Green />
            </Panel>
          </FlexColumn>
        </Sidebar>
      </FlexRow>
    );
  }
}
```

## DataInspector

The `DataInspector` component is used to unpack and display a javascript object. It is used to show View properties in the layout inspector, and to show event data in the analytics plugins.

```javascript
import {FlexColumn, DataInspector, FlipperPlugin} from 'flipper';

type State = {};

export default class MyFlipperPlugin extends FlipperPlugin<State> {
  static title = 'My Plugin';
  static id = 'my-plugin';

  static data = {
    one: 1,
    two: '2',
    three: [1, 2, 3],
  };

  render() {
    return (
      <FlexColumn fill={true}>
        <DataInspector data={MyFlipperPlugin.data} />
      </FlexColumn>
    );
  }
}
```

## Toolbar

The `Toolbar` component can display a toolbar with buttons, inputs, etc. A `<Spacer />` can be used to fill the space between items.

```javascript
import {Toolbar, Spacer, Button, FlipperPlugin} from 'flipper';

export default class MyFlipperPlugin extends FlipperPlugin<State> {
  render() {
    return (
      <Toolbar fill={true}>
        <Button>Button A</Button>
        <Spacer />
        <Button>Button B</Button>
      </Toolbar>
    );
  }
}
```

## Popover

Used to display content in an overlay.

```javascript
import {Popover, FlipperPlugin} from 'flipper';

export default class MyFlipperPlugin extends FlipperPlugin<State> {
  render() {
    return (
      {this.state.popoverVisible && <Popover onDismiss={() => this.setState({popoverVisible: false})}>
        ...
      </Popover >}
    );
  }
}
```

## ContextMenu

Add a native context menu to a component by wrapping it with the ContextMenu component.

```javascript
import {ContextMenu, FlipperPlugin} from 'flipper';

export default class MyFlipperPlugin extends FlipperPlugin<State> {
  contextMenuItems = [
    {
      label: 'Copy',
      click: this.copy,
    },
    {
      type: 'separator',
    },
    {
      label: 'Clear All',
      click: this.clear,
    },
  ];

  render() {
    return <ContextMenu items={this.contextMenuItems}>...</ContextMenu>;
  }
}
```

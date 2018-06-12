---
id: ui-components
title: UI Components
sidebar_label: UI Components
---

Sonar has a lot of built in React components to build UIs. You can find all of these in [`src/ui/components`](https://github.com/facebook/Sonar/tree/master/src/ui/components) and can import them directly using `import {Button} from 'sonar'`.

## FlexBox

In Sonar we make heavy use of flexbox for layout. FlexBox is layout system on the web which has been specifically design for building application like UIs. Sonar provides two flexbox components `FlexRow` and `FlexColumn`. These are flexbox components with some sane defaults such as automatically scrolling content that overflows.

```javascript
import { FlexRow, FlexColumn } from 'sonar';

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
import {FlexRow, styled} from 'sonar';

const CenterFlexRow = FlexRow.extends({
  justifyContent: 'center',
});

// Align children horizontally in the center
<CenterFlexRow>{children}</CenterFlexRow>;
```

## Text

The `Text` component is available to render any text in your plugin. To render headers and subtitle differently for example, we used the styled module. With this we can also change the color, text alignment, and any other properties typically found on a `span`.

```javascript
import {Text, styled, colors} from 'sonar';

const Title = Text.extends({
  color: colors.red,
});

<Title code={true}>Sonar Subtitle</Title>;
```

## Buttons

Sonar comes with a couple of button styles built in! As always you can style then further using the styled module but we expect the pre-defined buttons to fit most UIs.

```javascript
import {Button} from 'sonar';

<Button onClick={this.onClick} icon="airport" compact={true}>
  Click Me!
</Button>;
```

You can create a group of buttons by surrounding it with `<ButtonGroup>`.

## Sidebar

The `Sidebar` component provides a nice abstraction around some common but complex behavior. The `Sidebar` is used by all major Sonar plugins and using it in your plugin will ensure your plugin behaves similarly, such as allowing for resizing.

```javascript
import {FlexRow, Sidebar, colors, styled} from 'infinity-ui';
import {SonarPlugin} from 'sonar';

type State = {};

export default class MySonarPlugin extends SonarPlugin<State> {
  static title = 'My Plugin';
  static id = 'my-plugin';

  static Red = styled.view({
    backgroundColor: colors.red,
  });

  static Blue = styled.view({
    backgroundColor: colors.blue,
  });

  render() {
    return (
      <FlexRow fill={true}>
        <MySonarPlugin.Red fill={true} />

        <Sidebar position="right" width={400} minWidth={300}>
          <MySonarPlugin.Blue fill={true} />
        </Sidebar>
      </FlexRow>
    );
  }
}
```

## Panel

Panels are a way to section data, and make it collapsible. They are often used in sidebars. Just give the Panel a heading and some content and it makes sure that it displays in the same style as the rest of Sonar.

```javascript
import {
  FlexColumn,
  FlexRow,
  Sidebar,
  Panel,
  colors,
  styled,
  SonarPlugin,
} from 'sonar';

type State = {};

export default class MySonarPlugin extends SonarPlugin<State> {
  static title = 'My Plugin';
  static id = 'my-plugin';

  static Red = styled.view({
    backgroundColor: colors.red,
  });

  static Blue = styled.view({
    backgroundColor: colors.blue,
    height: 200,
  });

  static Green = styled.view({
    backgroundColor: colors.green,
    height: 200,
  });

  render() {
    return (
      <FlexRow fill={true}>
        <MySonarPlugin.Red fill={true} />

        <Sidebar position="right" width={400} minWidth={300}>
          <FlexColumn>
            <Panel heading={'Blue'} floating={false}>
              <MySonarPlugin.Blue />
            </Panel>

            <Panel heading={'Green'} floating={false}>
              <MySonarPlugin.Green />
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
import {FlexColumn, DataInspector, SonarPlugin} from 'sonar';

type State = {};

export default class MySonarPlugin extends SonarPlugin<State> {
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
        <DataInspector data={MySonarPlugin.data} />
      </FlexColumn>
    );
  }
}
```

## Toolbar

The `Toolbar` component can display a toolbar with buttons, inputs, etc. A `<Spacer />` can be used to fill the space between items.

```javascript
import {Toolbar, Spacer, Button, SonarPlugin} from 'sonar';

export default class MySonarPlugin extends SonarPlugin<State> {
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
import {Popover, SonarPlugin} from 'sonar';

export default class MySonarPlugin extends SonarPlugin<State> {
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
import {ContextMenu, SonarPlugin} from 'sonar';

export default class MySonarPlugin extends SonarPlugin<State> {
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

---
id: styling-components
title: Styling Components
sidebar_label: Styling Components
---

We use a styled-component based approach to styling our views. This means styles are defined in JavaScript and are written as CSS-stylesheets to the DOM. A component and it's styles are coupled. Styled components can extend another to inherit their styles.

## Basic tags

For basic building blocks (views, texts, ...) you can use the styled object.

```javascript
import {styled} from 'sonar';

const MyView = styled.view({
  fontSize: 10,
  color: colors.red
});
const MyText = styled.text({ ... });
const MyImage = styled.image({ ... });
const MyInput = styled.input({ ... });
```

But you can use any other HTML-tags like this:

```javascript
styled.customHTMLTag('canvas', { ... });
```

## Extending Sonar Components

It's very common for components to require customizing Sonar's components in some way. For example changing colors, alignment, or wrapping behavior. There is a `extends` method on all styled components which allows adding or overwriting existing style rules.

For these use cases when a styled component is only used within the context of a single component we encourage declaring it as a inner static instance. This makes it clear where the component is used and avoids polluting the global namespace.

```javascript
class MyComponent extends Component {
  static Container = FlexRow.extends({
    alignItems: 'center',
  });

  render() {
    return <MyComponent.Container>...</MyComponent.Container>;
  }
}
```

## CSS

The CSS-in-JS object passed to the styled components takes just any CSS rule, with the difference that it uses camel cased keys for the properties. Pixel-values can be numbers, any other values need to be strings.

Dynamic values also can be functions, receiving the react props as argument. (Make sure to add properties passed to a component to the `ignoredAttributes` array to not be written to the DOM as an attribute.)

```javascript
const MyView = styled.view(
  {
    fontSize: 10,
    color: props => (props.disabled ? colors.red : colors.black),
  },
  {
    ignoredAttributes: ['disabled'],
  }
);
```

Pseudo-classes can be used like this:

```javascript
'&:hover': {color: colors.red}`
```

## Colors

The colors module contains all standard colors used by Sonar. All the available colors are defined in `src/ui/components/colors.js` with comments about suggested usage of them. And we strongly encourage to use them.

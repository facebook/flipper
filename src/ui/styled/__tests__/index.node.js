/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import styled, {buildKeyframes, flush, gc, tracker} from '../index.js';

const ReactTestRenderer = require('react-test-renderer');
const invariant = require('invariant');
const React = require('react'); // eslint-disable-line

const BasicComponent = styled.view({
  color: 'red',
});

const DynamicComponent = styled.view({
  color: props => props.color,
});

test('can create a basic component without any errors', () => {
  let component;

  try {
    component = ReactTestRenderer.create(<BasicComponent />);
    component.toJSON();
    component.unmount();
    gc.flush();
  } finally {
    if (component) {
      component.unmount();
    }
    gc.flush();
  }
});

test('can create a basic component and garbage collect', () => {
  let component;

  try {
    component = ReactTestRenderer.create(<BasicComponent />);
    const tree = component.toJSON();

    expect(tree.type).toBe('div');

    const className = tree.props.className;
    expect(gc.hasQueuedCollection()).toBe(false);
    expect(gc.getReferenceCount(className)).toBe(1);

    component.unmount();
    expect(gc.getReferenceCount(className)).toBe(0);
    expect(gc.hasQueuedCollection()).toBe(true);
  } finally {
    if (component) {
      component.unmount();
    }
    gc.flush();
  }
});

test('remove outdated classes when updating component', () => {
  let component;

  try {
    component = ReactTestRenderer.create(<DynamicComponent color="red" />);
    const tree = component.toJSON();

    const className = tree.props.className;
    expect(gc.hasQueuedCollection()).toBe(false);
    expect(gc.getReferenceCount(className)).toBe(1);

    // updating with the same props should generate the same style and not trigger a collection
    component.update(<DynamicComponent color="red" />);
    expect(gc.hasQueuedCollection()).toBe(false);
    expect(gc.getReferenceCount(className)).toBe(1);

    // change style
    component.update(<DynamicComponent color="blue" />);
    expect(gc.hasQueuedCollection()).toBe(true);
    expect(gc.getReferenceCount(className)).toBe(0);
  } finally {
    if (component) {
      component.unmount();
    }
    gc.flush();
  }
});

test('extra class names should be preserved', () => {
  let component;

  try {
    component = ReactTestRenderer.create(<BasicComponent className="foo" />);
    const tree = component.toJSON();
    expect(tree.props.className.split(' ').includes('foo')).toBe(true);
  } finally {
    if (component) {
      component.unmount();
    }
    gc.flush();
  }
});

test('should inherit component when passed as first arg to styled', () => {
  let component;

  try {
    const InheritComponent = BasicComponent.extends({
      backgroundColor: 'black',
    });

    component = ReactTestRenderer.create(<InheritComponent />);
    const tree = component.toJSON();

    const rules = tracker.get(tree.props.className);
    invariant(rules, 'expected rules');
    expect(rules.style).toEqual({
      'background-color': 'black',
      color: 'red',
    });
  } finally {
    if (component) {
      component.unmount();
    }
    gc.flush();
  }
});

test("when passed class name of another styled component it's rules should be inherited", () => {
  let component;

  try {
    class BaseComponent extends styled.StylableComponent<{
      className: string,
    }> {
      render() {
        return <BasicComponent className={this.props.className} />;
      }
    }

    const InheritComponent = BaseComponent.extends({
      backgroundColor: 'black',
    });

    component = ReactTestRenderer.create(<InheritComponent />);
    const tree = component.toJSON();

    const rules = tracker.get(tree.props.className);
    invariant(rules, 'expected rules');
    expect(rules.style).toEqual({
      'background-color': 'black',
      color: 'red',
    });
  } finally {
    if (component) {
      component.unmount();
    }
    gc.flush();
  }
});

test('supports pseudo selectors', () => {
  let component;

  try {
    const Component = styled.view({
      '&:hover': {
        color: 'red',
      },
    });

    component = ReactTestRenderer.create(<Component />);
    const tree = component.toJSON();

    const rules = tracker.get(tree.props.className);
    invariant(rules, 'expected rules');
    expect(rules.style).toEqual({
      color: 'red',
    });
  } finally {
    if (component) {
      component.unmount();
    }
    gc.flush();
  }
});

test('supports multiple pseudo selectors', () => {
  let component;

  try {
    const Component = styled.view({
      '&:active': {
        color: 'blue',
      },

      '&:hover': {
        color: 'red',
      },
    });

    component = ReactTestRenderer.create(<Component />);
    const tree = component.toJSON();

    const classes = tree.props.className.split(' ');
    expect(classes.length).toBe(2);

    const hoverRules = tracker.get(classes[1]);
    invariant(hoverRules, 'expected hoverRules');
    expect(hoverRules.style).toEqual({
      color: 'red',
    });
    expect(hoverRules.namespace).toBe('&:hover');
    expect(hoverRules.selector.endsWith(':hover')).toBe(true);

    const activeRules = tracker.get(classes[0]);
    invariant(activeRules, 'expected activeRules');
    expect(activeRules.style).toEqual({
      color: 'blue',
    });
    expect(activeRules.namespace).toBe('&:active');
    expect(activeRules.selector.endsWith(':active')).toBe(true);
  } finally {
    if (component) {
      component.unmount();
    }
    gc.flush();
  }
});

test('supports child selectors', () => {
  let component;

  try {
    const Component = styled.view({
      '> li': {
        color: 'red',
      },
    });

    component = ReactTestRenderer.create(<Component />);
    const tree = component.toJSON();

    const classes = tree.props.className.split(' ');
    expect(classes.length).toBe(1);

    const rules = tracker.get(classes[0]);
    invariant(rules, 'expected rules');

    expect(rules.style).toEqual({
      color: 'red',
    });
    expect(rules.namespace).toBe('> li');
    expect(rules.selector.endsWith(' > li')).toBe(true);
  } finally {
    if (component) {
      component.unmount();
    }
    gc.flush();
  }
});

test('flush', () => {
  flush();
});

test('innerRef works on styled components', () => {
  let component;

  try {
    const Component = styled.view({});

    let called = false;
    const innerRef = ref => {
      called = true;
    };
    ReactTestRenderer.create(<Component innerRef={innerRef} />);
    expect(called).toBe(true);
  } finally {
    if (component) {
      component.unmount();
    }
    gc.flush();
  }
});

test('ignoreAttributes', () => {
  let component;

  try {
    const Component = styled.view(
      {
        color: props => props.color,
      },
      {
        ignoreAttributes: ['color'],
      },
    );

    component = ReactTestRenderer.create(<Component color="red" />);
    const tree = component.toJSON();

    expect(tree.props.color).toBe(undefined);

    const rules = tracker.get(tree.props.className);
    invariant(rules, 'expected rules');
    expect(rules.style).toEqual({
      color: 'red',
    });
  } finally {
    if (component) {
      component.unmount();
    }
    gc.flush();
  }
});
test('buildKeyframes', () => {
  const css = buildKeyframes({
    '0%': {
      opacity: 0,
    },

    '50%': {
      height: 50,
      opacity: 0.8,
    },

    '100%': {
      opacity: 1,
    },
  });

  expect(css).toBe(
    [
      '  0% {',
      '    opacity: 0;',
      '  }',
      '  50% {',
      '    height: 50px;',
      '    opacity: 0.8;',
      '  }',
      '  100% {',
      '    opacity: 1;',
      '  }',
    ].join('\n'),
  );
});

test('keyframes', () => {
  const className = styled.keyframes({
    '0%': {
      opacity: 0,
    },

    '50%': {
      opacity: 0.8,
    },

    '100%': {
      opacity: 1,
    },
  });
  expect(typeof className).toBe('string');
});

test('buildKeyframes only accepts string property values', () => {
  expect(() => {
    buildKeyframes({
      // $FlowFixMe: ignore
      '0%': {
        fn: () => {},
      },
    });
  }).toThrow('Keyframe objects must only have strings values');
});

test('buildKeyframes only accepts object specs', () => {
  expect(() => {
    buildKeyframes({
      // $FlowFixMe: ignore
      '0%': () => {
        return '';
      },
    });
  }).toThrow('Keyframe spec must only have objects');
});

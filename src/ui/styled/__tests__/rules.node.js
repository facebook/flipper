/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {buildRules, normaliseRules} from '../rules.js';

describe('normaliseRules', () => {
  test('ensure top level values are expanded', () => {
    const normalisedRules = normaliseRules({height: '4px'});
    expect(normalisedRules['&'].height).toBe('4px');
  });

  test('ensure keys are dashed', () => {
    const normalisedRules = normaliseRules({
      // $FlowFixMe: ignore
      '&:hover': {
        lineHeight: '4px',
        WebkitAppRegion: 'drag',
      },
    });
    const hoverRules = normalisedRules['&:hover'];
    expect(Object.keys(hoverRules).length).toBe(2);
    expect(hoverRules['line-height']).toBe('4px');
    expect(hoverRules['-webkit-app-region']).toBe('drag');
  });

  test('exclude empty objects', () => {
    const normalisedRules = normaliseRules({
      '&:hover': {},
    });

    expect(normalisedRules['&:hover']).toBe(undefined);
  });
});

describe('buildRules', () => {
  test('ensure null values are left out', () => {
    const builtRules = buildRules({height: (null: any)}, {}, {});
    expect('height' in builtRules).toBe(false);

    const builtRules2 = buildRules(
      {
        height() {
          return (null: any);
        },
      },
      {},
      {},
    );
    expect('height' in builtRules2).toBe(false);
  });

  test('ensure numbers are appended with px', () => {
    expect(buildRules({height: 40}, {}, {}).height).toBe('40px');
  });

  test("ensure unitless numbers aren't appended with px", () => {
    expect(buildRules({'z-index': 4}, {}, {})['z-index']).toBe('4');
  });

  test('ensure functions are called with props', () => {
    const thisProps = {};
    expect(
      buildRules(
        {
          border: props => (props === thisProps ? 'foo' : 'bar'),
        },
        thisProps,
        {},
      ).border,
    ).toBe('foo');
  });
});

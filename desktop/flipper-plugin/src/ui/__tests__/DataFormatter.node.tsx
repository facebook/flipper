/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DataFormatter} from '../DataFormatter';

test('default formatter', () => {
  expect(DataFormatter.format(true)).toMatchInlineSnapshot(`"true"`);
  expect(DataFormatter.format(false)).toMatchInlineSnapshot(`"false"`);
  expect(DataFormatter.format(3)).toMatchInlineSnapshot(`"3"`);
  expect(DataFormatter.format(null)).toMatchInlineSnapshot(`""`);
  expect(DataFormatter.format(undefined)).toMatchInlineSnapshot(`""`);
  expect(
    DataFormatter.format(new Date(2020, 2, 3, 5, 8, 4, 244654)),
  ).toMatchInlineSnapshot(`"05:12:08.654"`);
  expect(DataFormatter.format('test')).toMatchInlineSnapshot(`"test"`);

  expect(DataFormatter.format({hello: 'world'})).toMatchInlineSnapshot(`
    "{
      \\"hello\\": \\"world\\"
    }"
  `);
  expect(DataFormatter.format({hello: ['world']})).toMatchInlineSnapshot(`
    "{
      \\"hello\\": [
        \\"world\\"
      ]
    }"
  `);
  expect(DataFormatter.format(new Map([['hello', 'world']])))
    .toMatchInlineSnapshot(`
    "[
      [
        \\"hello\\",
        \\"world\\"
      ]
    ]"
  `);
  expect(DataFormatter.format(new Set([['hello', 'world']])))
    .toMatchInlineSnapshot(`
    "[
      [
        \\"hello\\",
        \\"world\\"
      ]
    ]"
  `);

  const unserializable: any = {};
  unserializable.x = unserializable;
  expect(DataFormatter.format(unserializable)).toMatchInlineSnapshot(`
    "<Failed to serialize: TypeError: Converting circular structure to JSON
        --> starting at object with constructor 'Object'
        --- property 'x' closes the circle>"
  `);

  // make sure we preserve newlines
  expect(DataFormatter.format('Test 123\n\t\t345\n\t\t67'))
    .toMatchInlineSnapshot(`
    "Test 123
    		345
    		67"
  `);
});

test('linkify formatter', () => {
  const linkify = (value: any) =>
    DataFormatter.format(value, DataFormatter.linkify);

  // verify fallback
  expect(linkify({hello: 'world'})).toMatchInlineSnapshot(`
    "{
      \\"hello\\": \\"world\\"
    }"
  `);
  expect(linkify('hi there!')).toMatchInlineSnapshot(`"hi there!"`);
  expect(linkify('https://www.google.com')).toMatchInlineSnapshot(`
    <React.Fragment>
      
      <ForwardRef(Link)
        href="https://www.google.com"
      >
        https://www.google.com
      </ForwardRef(Link)>
      
    </React.Fragment>
  `);
  expect(linkify('www.google.com')).toMatchInlineSnapshot(`"www.google.com"`);
  expect(linkify('stuff.google.com')).toMatchInlineSnapshot(
    `"stuff.google.com"`,
  );
  expect(linkify('test https://www.google.com test')).toMatchInlineSnapshot(`
    <React.Fragment>
      test 
      <ForwardRef(Link)
        href="https://www.google.com"
      >
        https://www.google.com
      </ForwardRef(Link)>
       test
    </React.Fragment>
  `);
  expect(linkify('https://www.google.com test http://fb.com'))
    .toMatchInlineSnapshot(`
    <React.Fragment>
      
      <ForwardRef(Link)
        href="https://www.google.com"
      >
        https://www.google.com
      </ForwardRef(Link)>
       test 
      <ForwardRef(Link)
        href="http://fb.com"
      >
        http://fb.com
      </ForwardRef(Link)>
      
    </React.Fragment>
  `);
  expect(linkify('fb.com')).toMatchInlineSnapshot(`"fb.com"`);
});

test('linkify formatter', () => {
  const jsonify = (value: any) =>
    DataFormatter.format(value, DataFormatter.prettyPrintJson);

  expect(jsonify({hello: 'world'})).toMatchInlineSnapshot(`
      "{
        \\"hello\\": \\"world\\"
      }"
    `);
  expect(jsonify([{hello: 'world'}])).toMatchInlineSnapshot(`
    "[
      {
        \\"hello\\": \\"world\\"
      }
    ]"
  `);
  // linkify json!
  expect(
    DataFormatter.format({hello: 'http://facebook.com'}, [
      DataFormatter.prettyPrintJson,
      DataFormatter.linkify,
    ]),
  ).toMatchInlineSnapshot(`
    <React.Fragment>
      {
      "hello": "
      <ForwardRef(Link)
        href="http://facebook.com"
      >
        http://facebook.com
      </ForwardRef(Link)>
      "
    }
    </React.Fragment>
  `);
});

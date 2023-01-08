/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {render, fireEvent} from '@testing-library/react';
import React from 'react';
import {act} from 'react-dom/test-utils';
import {DataFormatter, TruncateHelper} from '../DataFormatter';

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

test.unix('date formatter', () => {
  // dates on windows don't support changed timezones
  expect(
    DataFormatter.format(new Date(1668609938.068577 * 1000)),
  ).toMatchInlineSnapshot(`"01:45:38.068"`);
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

test('jsonify formatter', () => {
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

test("jsonify doesn't process react elements", () => {
  const jsonify = (value: any) =>
    DataFormatter.format(value, DataFormatter.prettyPrintJson);

  expect(jsonify('abcde')).toEqual('abcde');
  expect(jsonify('{ a: 1 }')).toMatchInlineSnapshot(`"{ a: 1 }"`);
  expect(jsonify({a: 1})).toMatchInlineSnapshot(`
    "{
      \\"a\\": 1
    }"
  `);
  expect(jsonify(<span>hi</span>)).toMatchInlineSnapshot(`
    <span>
      hi
    </span>
  `);
});

test('truncate formatter', () => {
  const truncate = (value: any) =>
    DataFormatter.format(value, DataFormatter.truncate(5));

  expect(truncate({test: true})).toMatchInlineSnapshot(`
    "{
      \\"test\\": true
    }"
  `);
  expect(truncate('abcde')).toEqual('abcde');
  expect(truncate('abcdefghi')).toMatchInlineSnapshot(`
    <TruncateHelper
      maxLength={5}
      value="abcdefghi"
    />
  `);
});

test('render truncate helper', () => {
  const res = render(
    <TruncateHelper value="!! COOL CONTENT !!" maxLength={4} />,
  );
  expect(res.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        !! C
        <button
          class="ant-btn ant-btn-text ant-btn-sm"
          style="margin-left: 4px;"
          type="button"
        >
          <span
            aria-label="caret-right"
            class="anticon anticon-caret-right"
            role="img"
          >
            <svg
              aria-hidden="true"
              data-icon="caret-right"
              fill="currentColor"
              focusable="false"
              height="1em"
              viewBox="0 0 1024 1024"
              width="1em"
            >
              <path
                d="M715.8 493.5L335 165.1c-14.2-12.2-35-1.2-35 18.5v656.8c0 19.7 20.8 30.7 35 18.5l380.8-328.4c10.9-9.4 10.9-27.6 0-37z"
              />
            </svg>
          </span>
          <span>
            and 14 more
          </span>
        </button>
        <button
          class="ant-btn ant-btn-text ant-btn-sm"
          style="margin-left: 4px;"
          type="button"
        >
          <span
            aria-label="copy"
            class="anticon anticon-copy"
            role="img"
          >
            <svg
              aria-hidden="true"
              data-icon="copy"
              fill="currentColor"
              focusable="false"
              height="1em"
              viewBox="64 64 896 896"
              width="1em"
            >
              <path
                d="M832 64H296c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h496v688c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8V96c0-17.7-14.3-32-32-32zM704 192H192c-17.7 0-32 14.3-32 32v530.7c0 8.5 3.4 16.6 9.4 22.6l173.3 173.3c2.2 2.2 4.7 4 7.4 5.5v1.9h4.2c3.5 1.3 7.2 2 11 2H704c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32zM350 856.2L263.9 770H350v86.2zM664 888H414V746c0-22.1-17.9-40-40-40H232V264h432v624z"
              />
            </svg>
          </span>
          <span>
            copy
          </span>
        </button>
      </div>
    </body>
  `);
  act(() => {
    fireEvent.click(res.getAllByText(/and \d+ more/)[0]);
  });
  expect(res.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        !! COOL CONTENT !!
        <button
          class="ant-btn ant-btn-text ant-btn-sm"
          style="margin-left: 4px;"
          type="button"
        >
          <span
            aria-label="caret-up"
            class="anticon anticon-caret-up"
            role="img"
          >
            <svg
              aria-hidden="true"
              data-icon="caret-up"
              fill="currentColor"
              focusable="false"
              height="1em"
              viewBox="0 0 1024 1024"
              width="1em"
            >
              <path
                d="M858.9 689L530.5 308.2c-9.4-10.9-27.5-10.9-37 0L165.1 689c-12.2 14.2-1.2 35 18.5 35h656.8c19.7 0 30.7-20.8 18.5-35z"
              />
            </svg>
          </span>
          <span>
            collapse
          </span>
        </button>
        <button
          class="ant-btn ant-btn-text ant-btn-sm"
          style="margin-left: 4px;"
          type="button"
        >
          <span
            aria-label="copy"
            class="anticon anticon-copy"
            role="img"
          >
            <svg
              aria-hidden="true"
              data-icon="copy"
              fill="currentColor"
              focusable="false"
              height="1em"
              viewBox="64 64 896 896"
              width="1em"
            >
              <path
                d="M832 64H296c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h496v688c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8V96c0-17.7-14.3-32-32-32zM704 192H192c-17.7 0-32 14.3-32 32v530.7c0 8.5 3.4 16.6 9.4 22.6l173.3 173.3c2.2 2.2 4.7 4 7.4 5.5v1.9h4.2c3.5 1.3 7.2 2 11 2H704c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32zM350 856.2L263.9 770H350v86.2zM664 888H414V746c0-22.1-17.9-40-40-40H232V264h432v624z"
              />
            </svg>
          </span>
          <span>
            copy
          </span>
        </button>
      </div>
    </body>
  `);
});

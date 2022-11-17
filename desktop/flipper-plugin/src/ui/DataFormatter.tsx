/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  CaretRightOutlined,
  CaretUpOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import {Button, Typography} from 'antd';
import {isPlainObject, padStart} from 'lodash';
import React, {createElement, Fragment, isValidElement, useState} from 'react';
import {_tryGetFlipperLibImplementation} from 'flipper-plugin-core';
import {safeStringify} from 'flipper-plugin-core';
import {urlRegex} from '../utils/urlRegex';
import {useTableRedraw} from '../data-source/index';
import {theme} from './theme';
import {HighlightManager} from './Highlight';

/**
 * A Formatter is used to render an arbitrarily value to React. If a formatter returns 'undefined'
 * it is considered a 'miss' and the next formatter will be tried, eventually falling back to the default formatter.
 *
 * In case further processing by the default formatter is to be avoided, make sure a string is returned from any custom formatter.
 */
export type Formatter = (
  value: any,
  highlighter?: HighlightManager,
) => string | React.ReactElement | any;

export const DataFormatter = {
  defaultFormatter(value: any, highlighter?: HighlightManager) {
    if (isValidElement(value)) {
      return value;
    }
    let res = '';
    switch (typeof value) {
      case 'boolean':
        res = value ? 'true' : 'false';
        break;
      case 'number':
        res = '' + value;
        break;
      case 'undefined':
        break;
      case 'string':
        res = value;
        break;
      case 'object': {
        if (value === null) break;
        if (value instanceof Date) {
          res =
            value.toTimeString().split(' ')[0] +
            '.' +
            padStart('' + value.getMilliseconds(), 3, '0');
          break;
        }
        if (value instanceof Map) {
          res = safeStringify(Array.from(value.entries()));
          break;
        }
        if (value instanceof Set) {
          res = safeStringify(Array.from(value.values()));
          break;
        }
        res = safeStringify(value);
        break;
      }
      default:
        res = '<unrenderable value>';
    }
    return highlighter?.render(res) ?? res;
  },

  truncate(maxLength: number) {
    return (value: any, highlighter?: HighlightManager) => {
      if (typeof value === 'string' && value.length > maxLength) {
        return (
          <TruncateHelper
            value={value}
            maxLength={maxLength}
            textWrapper={highlighter}
          />
        );
      }
      return value;
    };
  },

  /**
   * Formatter that will automatically create links for any urls inside the data
   */
  linkify(value: any) {
    if (typeof value === 'string' && urlRegex.test(value)) {
      return createElement(
        Fragment,
        undefined,
        // spreading children avoids the need for keys and reconciles by index
        ...value.split(urlRegex).map((part, index) =>
          // odd items are the links
          index % 2 === 1 ? (
            <Typography.Link href={part}>{part}</Typography.Link>
          ) : (
            part
          ),
        ),
      );
    }
    return value;
  },

  prettyPrintJson(value: any) {
    if (isValidElement(value)) {
      return value;
    }
    if (typeof value === 'string' && value.length >= 2) {
      const last = value.length - 1;
      // kinda looks like json

      if (
        (value[0] === '{' && value[last] === '}') ||
        (value[0] === '[' && value[last] === ']')
      ) {
        try {
          value = JSON.parse(value);
        } catch (e) {
          // intentional fall through, can't parse this 'json'
        }
      }
    }
    if (
      typeof value === 'object' &&
      value !== null &&
      (Array.isArray(value) || isPlainObject(value))
    ) {
      try {
        // Note: we don't need to be inserted <br/>'s in the output, but assume the text container uses
        // white-space: pre-wrap (or pre)
        return JSON.stringify(value, null, 2);
      } catch (e) {
        // intentional fall through, can't pretty print this 'json'
      }
    }
    return value;
  },

  format(
    value: any,
    formatters?: Formatter[] | Formatter,
    highlighter?: HighlightManager,
  ): any {
    let res = value;
    if (Array.isArray(formatters)) {
      for (const formatter of formatters) {
        res = formatter(res, highlighter);
      }
    } else if (formatters) {
      res = formatters(res, highlighter);
    }
    return DataFormatter.defaultFormatter(res, highlighter);
  },
};

// exported for testing
export function TruncateHelper({
  value,
  maxLength,
  textWrapper,
}: {
  value: string;
  maxLength: number;
  textWrapper?: HighlightManager; //Could be a generic type
}) {
  const [collapsed, setCollapsed] = useState(true);
  const redrawRow = useTableRedraw();
  const message = collapsed ? value.substr(0, maxLength) : value;
  return (
    <>
      {textWrapper ? textWrapper.render(message) : message}
      <Button
        onClick={() => {
          setCollapsed((c) => !c);
          redrawRow?.();
        }}
        size="small"
        type="text"
        style={truncateButtonStyle}
        icon={collapsed ? <CaretRightOutlined /> : <CaretUpOutlined />}>
        {collapsed ? `and ${value.length - maxLength} more` : 'collapse'}
      </Button>
      <Button
        icon={<CopyOutlined />}
        onClick={() => {
          _tryGetFlipperLibImplementation()?.writeTextToClipboard(value);
        }}
        size="small"
        type="text"
        style={truncateButtonStyle}>
        copy
      </Button>
    </>
  );
}

const truncateButtonStyle = {
  color: theme.primaryColor,
  marginLeft: 4,
};

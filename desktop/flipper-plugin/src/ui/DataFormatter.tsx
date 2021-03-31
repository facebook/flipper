/**
 * Copyright (c) Facebook, Inc. and its affiliates.
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
import {isPlainObject, pad} from 'lodash';
import React, {createElement, Fragment, isValidElement, useState} from 'react';
import {tryGetFlipperLibImplementation} from '../plugin/FlipperLib';
import {safeStringify} from '../utils/safeStringify';
import {urlRegex} from '../utils/urlRegex';
import {useTableRedraw} from './datatable/DataSourceRenderer';
import {theme} from './theme';

/**
 * A Formatter is used to render an arbitrarily value to React. If a formatter returns 'undefined'
 * it is considered a 'miss' and the next formatter will be tried, eventually falling back to the default formatter.
 *
 * In case further processing by the default formatter is to be avoided, make sure a string is returned from any custom formatter.
 */
export type Formatter = (value: any) => string | React.ReactElement | any;

export const DataFormatter = {
  defaultFormatter(value: any) {
    if (isValidElement(value)) {
      return value;
    }
    switch (typeof value) {
      case 'boolean':
        return value ? 'true' : 'false';
      case 'number':
        return '' + value;
      case 'undefined':
        return '';
      case 'string':
        return value;
      case 'object': {
        if (value === null) return '';
        if (value instanceof Date) {
          return (
            value.toTimeString().split(' ')[0] +
            '.' +
            pad('' + value.getMilliseconds(), 3)
          );
        }
        if (value instanceof Map) {
          return safeStringify(Array.from(value.entries()));
        }
        if (value instanceof Set) {
          return safeStringify(Array.from(value.values()));
        }
        return safeStringify(value);
      }
      default:
        return '<unrenderable value>';
    }
  },

  truncate(maxLength: number) {
    return (value: any) => {
      if (typeof value === 'string' && value.length > maxLength) {
        return <TruncateHelper value={value} maxLength={maxLength} />;
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

  format(value: any, formatters?: Formatter[] | Formatter): any {
    let res = value;
    if (Array.isArray(formatters)) {
      for (const formatter of formatters) {
        res = formatter(res);
      }
    } else if (formatters) {
      res = formatters(res);
    }
    return DataFormatter.defaultFormatter(res);
  },
};

// exported for testing
export function TruncateHelper({
  value,
  maxLength,
}: {
  value: string;
  maxLength: number;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const redrawRow = useTableRedraw();

  return (
    <>
      {collapsed ? value.substr(0, maxLength) : value}
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
          tryGetFlipperLibImplementation()?.writeTextToClipboard(value);
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

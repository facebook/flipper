/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  DataDescriptionType,
  DataDescription,
  NullValue,
  BooleanValue,
  NumberValue,
  StringValue,
} from './DataDescription';
import styled from '@emotion/styled';
import {getSortedKeys} from './utils';
import {PureComponent} from 'react';
import React from 'react';
import {theme} from '../theme';

export type DataValueExtractor = (
  value: any,
  depth: number,
  path: string[],
) =>
  | {
      mutable: boolean;
      type: DataDescriptionType;
      value: any;
      extra?: any;
    }
  | undefined
  | null;

export const InspectorName = styled.span({
  color: theme.textColorPrimary,
});
InspectorName.displayName = 'DataInspector:InspectorName';

const PreviewContainer = styled.span({
  fontStyle: 'italic',
  color: theme.textColorSecondary,
  [`${InspectorName}`]: {
    color: theme.textColorSecondary,
  },
});
PreviewContainer.displayName = 'DataPreview:PreviewContainer';

function intersperse(arr: Array<any>, sep: string) {
  if (arr.length === 0) {
    return [];
  }

  return arr.slice(1).reduce(
    (xs: any, x: any) => {
      return xs.concat([sep, x]);
    },
    [arr[0]],
  );
}

export default class DataPreview extends PureComponent<{
  path: string[];
  type: string;
  value: any;
  depth: number;
  extractValue: DataValueExtractor;
  maxProperties: number;
}> {
  static defaultProps = {
    maxProperties: 5,
  };

  previewSimpleValue(propValue: any) {
    let propValueElement: React.ReactElement | null = null;
    switch (typeof propValue) {
      case 'object':
        if (propValue === null) propValueElement = <NullValue>null</NullValue>;
        break;
      case 'boolean':
        propValueElement = <BooleanValue>{'' + propValue}</BooleanValue>;
        break;
      case 'number':
        propValueElement = <NumberValue>{'' + propValue}</NumberValue>;
        break;
      case 'string':
        if (propValue.length <= 20) {
          propValueElement = <StringValue>{propValue}</StringValue>;
        }
        break;
    }
    return propValueElement;
  }

  render() {
    const {depth, extractValue, path, type, value} = this.props;

    if (type === 'array') {
      return (
        <PreviewContainer>
          {'['}
          {intersperse(
            value.map((element: any, index: number) => {
              const res = extractValue(element, depth + 1, path);
              if (!res) {
                return null;
              }

              const {type, value} = res;
              return (
                <DataDescription
                  key={index}
                  type={type}
                  value={value}
                  setValue={null}
                />
              );
            }),
            ', ',
          )}
          {']'}
        </PreviewContainer>
      );
    } else if (type === 'date') {
      return <span>{value.toString()}</span>;
    } else if (type === 'object') {
      const propertyNodes = [];

      const keys = getSortedKeys(value);
      let i = 0;
      for (const key of keys) {
        let ellipsis;
        i++;
        if (i >= this.props.maxProperties) {
          ellipsis = <span key={'ellipsis'}>…</span>;
        }
        const propValueElement = this.previewSimpleValue(
          value[key]?.value ?? value[key], // might be a wrapped reflection object or not..
        );

        propertyNodes.push(
          <span key={key}>
            <InspectorName>
              {key}
              {propValueElement ? `: ` : null}
              {propValueElement}
            </InspectorName>
            {ellipsis}
          </span>,
        );

        if (ellipsis) {
          break;
        }
      }

      return (
        <PreviewContainer>
          {'{'}
          {intersperse(propertyNodes, ', ')}
          {'}'}
        </PreviewContainer>
      );
    } else {
      return null;
    }
  }
}

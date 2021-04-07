/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DataDescriptionType, _DataDescription} from 'flipper-plugin';
import styled from '@emotion/styled';
import {getSortedKeys} from './utils';
import {PureComponent} from 'react';
import React from 'react';
import {colors} from '../colors';

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
  color: colors.grapeDark1,
});
InspectorName.displayName = 'DataInspector:InspectorName';

const PreviewContainer = styled.span({
  fontStyle: 'italic',
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
                <_DataDescription
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

        propertyNodes.push(
          <span key={key}>
            <InspectorName>{key}</InspectorName>
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

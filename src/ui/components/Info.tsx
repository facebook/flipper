/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';
import React from 'react';

import {colors} from './colors';
import HBox from './HBox';

import Glyph from './Glyph';
import LoadingIndicator from './LoadingIndicator';
import FlexColumn from './FlexColumn';

export type InfoProps = {
  children: React.ReactNode;
  type: 'info' | 'spinning' | 'warning' | 'error';
  small?: boolean;
};

const icons = {
  info: 'info-circle',
  warning: 'caution-triangle',
  error: 'cross-circle',
};

const color = {
  info: colors.aluminumDark3,
  warning: colors.yellow,
  error: colors.red,
  spinning: colors.light30,
};

const bgColor = {
  info: colors.cyanTint,
  warning: colors.yellowTint,
  error: colors.redTint,
  spinning: 'transparent',
};

const InfoWrapper = styled(FlexColumn)<Pick<InfoProps, 'type' | 'small'>>(
  ({type, small}) => ({
    padding: small ? '0 4px' : 10,
    borderRadius: 4,
    color: color[type],
    border: `1px solid ${color[type]}`,
    background: bgColor[type],
    width: '100%',
  }),
);
InfoWrapper.displayName = 'InfoWrapper';

/**
 * Shows an info box with some text and a symbol.
 * Supported types: info | spinning | warning | error
 */
function Info({type, children, small}: InfoProps) {
  return (
    <InfoWrapper type={type} small={small}>
      <HBox>
        {type === 'spinning' ? (
          <LoadingIndicator size={small ? 12 : 24} />
        ) : (
          <Glyph
            name={icons[type]}
            color={color[type]}
            size={small ? 12 : 24}
            variant="filled"
          />
        )}
        <div>{children}</div>
      </HBox>
    </InfoWrapper>
  );
}

Info.defaultProps = {
  type: 'info',
};

export default Info;

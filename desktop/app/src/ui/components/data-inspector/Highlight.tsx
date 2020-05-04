/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';
import {colors} from '../colors';
import React from 'react';

const Highlighted = styled.span({
  backgroundColor: colors.lemon,
});

export const Highlight: React.FC<{text: string; highlight?: string}> = ({
  text,
  highlight,
}) => {
  if (!highlight) {
    return <span>{text}</span>;
  }
  const index = text.toLowerCase().indexOf(highlight.toLowerCase());
  if (index === -1) {
    return <span>{text}</span>;
  }
  return (
    <span>
      {text.substr(0, index)}
      <Highlighted>{text.substr(index, highlight.length)}</Highlighted>
      {text.substr(index + highlight.length)}
    </span>
  );
};

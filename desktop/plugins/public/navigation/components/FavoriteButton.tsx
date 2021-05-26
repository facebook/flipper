/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {styled, IconSize, colors} from 'flipper';
import {IconButton} from './';
import React from 'react';

type Props = {
  onClick?: () => void;
  highlighted: boolean;
  size: IconSize;
};

const FavoriteButtonContainer = styled.div({
  position: 'relative',
  '>:first-child': {
    position: 'absolute',
  },
  '>:last-child': {
    position: 'relative',
  },
});

export default (props: Props) => {
  const {highlighted, onClick, ...iconButtonProps} = props;
  return (
    <FavoriteButtonContainer>
      {highlighted ? (
        <IconButton
          outline={false}
          color={colors.lemon}
          icon="star"
          {...iconButtonProps}
        />
      ) : null}
      <IconButton outline icon="star" onClick={onClick} {...iconButtonProps} />
    </FavoriteButtonContainer>
  );
};

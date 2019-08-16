/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {styled} from 'flipper';
import {IconButton} from './';

type Props = {|
  onClick?: () => void,
  highlighted: boolean,
  size: 8 | 10 | 12 | 16 | 18 | 20 | 24 | 32,
|};

const FavoriteButtonContainer = styled('div')({
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
          color="#FFD700"
          icon="star"
          {...iconButtonProps}
        />
      ) : null}
      <IconButton
        outline={true}
        icon="star"
        onClick={onClick}
        {...iconButtonProps}
      />
    </FavoriteButtonContainer>
  );
};

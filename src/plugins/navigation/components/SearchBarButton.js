/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Glyph, styled} from 'flipper';

type Props = {|
  icon: string,
  onClick?: () => void,
|};

const SearchBarButton = styled('div')({
  marginRight: 9,
  marginTop: -3,
  marginLeft: 4,
  position: 'relative',
});

export default function(props: Props) {
  return (
    <SearchBarButton onClick={props.onClick}>
      <Glyph name={props.icon} size={16} variant="outline" />
    </SearchBarButton>
  );
}

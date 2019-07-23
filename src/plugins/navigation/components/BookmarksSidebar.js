/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import {DetailSidebar, FlexCenter, styled, colors} from 'flipper';

import type {Bookmark} from '../';

type Props = {|
  bookmarks: Array<Bookmark>,
|};

const NoData = styled(FlexCenter)({
  fontSize: 18,
  color: colors.macOSTitleBarIcon,
});

export default (props: Props) => {
  const {bookmarks} = props;
  return (
    <DetailSidebar>
      {bookmarks.length === 0 ? <NoData grow>No Bookmarks</NoData> : null}
    </DetailSidebar>
  );
};

/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {DetailSidebar, FlexCenter, styled, colors} from 'flipper';
import {Bookmark, URI} from '../types';
import {IconButton} from './';
import React from 'react';

type Props = {
  bookmarks: Map<string, Bookmark>;
  onNavigate: (uri: URI) => void;
  onRemove: (uri: URI) => void;
};

const NoData = styled(FlexCenter)({
  fontSize: 18,
  color: colors.macOSTitleBarIcon,
});

const BookmarksList = styled('div')({
  overflowY: 'scroll',
  overflowX: 'hidden',
  height: '100%',
  backgroundColor: colors.white,
  '.bookmark-container': {
    width: '100%',
    padding: '10px',
    cursor: 'pointer',
    borderBottom: `1px ${colors.greyTint} solid`,
  },
  '.bookmark-container:active': {
    backgroundColor: colors.highlight,
    color: colors.white,
  },
  '.bookmarks-title': {
    backgroundColor: colors.light02,
    padding: '10px',
    borderBottom: `1px ${colors.greyTint} solid`,
    fontWeight: 'bold',
  },
  '.bookmark-common-name': {
    fontSize: 14,
    overflowX: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    lineHeight: 1.2,
    fontWeight: 'bold',
  },
  '.bookmark-container:active>.bookmark-uri': {
    color: colors.white,
  },
  '.bookmark-uri': {
    fontSize: 10,
    overflowX: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    lineHeight: 1.2,
    color: colors.greyTint3,
  },
});

const DeleteButton = styled('div')({
  padding: 10,
  float: 'right',
});

const alphabetizeBookmarkCompare = (b1: Bookmark, b2: Bookmark) => {
  return b1.uri < b2.uri ? -1 : b1.uri > b2.uri ? 1 : 0;
};

export default (props: Props) => {
  const {bookmarks, onNavigate, onRemove} = props;
  return (
    <DetailSidebar>
      {bookmarks.size === 0 ? (
        <NoData grow>No Bookmarks</NoData>
      ) : (
        <BookmarksList>
          <div className="bookmarks-title">Bookmarks</div>
          {[...bookmarks.values()]
            .sort(alphabetizeBookmarkCompare)
            .map((bookmark, idx) => (
              <>
                <DeleteButton>
                  <IconButton
                    color={colors.macOSTitleBarButtonBackgroundActive}
                    outline={false}
                    icon="cross-circle"
                    size={16}
                    onClick={() => onRemove(bookmark.uri)}
                  />
                </DeleteButton>
                <div
                  key={idx}
                  className="bookmark-container"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onNavigate(bookmark.uri);
                  }}>
                  <div className="bookmark-common-name">
                    {bookmark.commonName}
                  </div>
                  <div className="bookmark-uri">{bookmark.uri}</div>
                </div>
              </>
            ))}
        </BookmarksList>
      )}
    </DetailSidebar>
  );
};

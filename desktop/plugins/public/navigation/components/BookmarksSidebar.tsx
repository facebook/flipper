/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  DetailSidebar,
  FlexCenter,
  styled,
  FlexRow,
  FlexColumn,
  Text,
  Panel,
} from 'flipper';
import {Bookmark, URI} from '../types';
import {IconButton} from './';
import React from 'react';
import {theme} from 'flipper-plugin';

type Props = {
  bookmarks: Map<string, Bookmark>;
  onNavigate: (uri: URI) => void;
  onRemove: (uri: URI) => void;
};

const NoData = styled(FlexCenter)({
  fontSize: 18,
  color: theme.textColorSecondary,
});

const BookmarksList = styled.div({
  overflowY: 'scroll',
  overflowX: 'hidden',
  height: '100%',
  backgroundColor: theme.backgroundDefault,
});

const BookmarkContainer = styled(FlexRow)({
  width: '100%',
  padding: 10,
  height: 55,
  alignItems: 'center',
  cursor: 'pointer',
  borderBottom: `1px ${theme.dividerColor} solid`,
  ':last-child': {
    borderBottom: '0',
  },
  ':active': {
    backgroundColor: theme.backgroundWash,
  },
});

const BookmarkTitle = styled(Text)({
  fontSize: '1.1em',
  overflowX: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  fontWeight: 500,
});

const BookmarkSubtitle = styled(Text)({
  overflowX: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  color: theme.textColorSecondary,
  marginTop: 4,
});

const TextContainer = styled(FlexColumn)({
  justifyContent: 'center',
});

const alphabetizeBookmarkCompare = (b1: Bookmark, b2: Bookmark) => {
  return b1.uri < b2.uri ? -1 : b1.uri > b2.uri ? 1 : 0;
};

export default (props: Props) => {
  const {bookmarks, onNavigate, onRemove} = props;
  return (
    <DetailSidebar>
      <Panel heading="Bookmarks" floating={false} padded={false}>
        {bookmarks.size === 0 ? (
          <NoData grow>No Bookmarks</NoData>
        ) : (
          <BookmarksList>
            {[...bookmarks.values()]
              .sort(alphabetizeBookmarkCompare)
              .map((bookmark, idx) => (
                <BookmarkContainer
                  key={idx}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onNavigate(bookmark.uri);
                  }}>
                  <TextContainer grow>
                    <BookmarkTitle>
                      {bookmark.commonName || bookmark.uri}
                    </BookmarkTitle>
                    {!bookmark.commonName && (
                      <BookmarkSubtitle>{bookmark.uri}</BookmarkSubtitle>
                    )}
                  </TextContainer>
                  <IconButton
                    color={theme.textColorSecondary}
                    outline={false}
                    icon="cross-circle"
                    size={16}
                    onClick={() => onRemove(bookmark.uri)}
                  />
                </BookmarkContainer>
              ))}
          </BookmarksList>
        )}
      </Panel>
    </DetailSidebar>
  );
};

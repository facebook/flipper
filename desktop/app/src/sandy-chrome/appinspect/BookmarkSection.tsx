/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useCallback, useMemo} from 'react';
import {AutoComplete, Input} from 'antd';
import {StarFilled, StarOutlined} from '@ant-design/icons';
import {useStore} from '../../utils/useStore';
import {NUX, useValue} from 'flipper-plugin';
import {navPluginStateSelector} from '../../chrome/LocationsButton';

// eslint-disable-next-line flipper/no-relative-imports-across-packages
import type {NavigationPlugin} from '../../../../plugins/navigation/index';

export function BookmarkSection() {
  const navPlugin = useStore(navPluginStateSelector);

  return navPlugin ? (
    <NUX
      title="Use bookmarks to directly navigate to a location in the app."
      placement="right">
      <BookmarkSectionInput navPlugin={navPlugin} />
    </NUX>
  ) : null;
}

function BookmarkSectionInput({navPlugin}: {navPlugin: NavigationPlugin}) {
  const currentURI = useValue(navPlugin.currentURI);
  const bookmarks = useValue(navPlugin.bookmarks);

  const isBookmarked = useMemo(() => bookmarks.has(currentURI), [
    bookmarks,
    currentURI,
  ]);
  const handleBookmarkClick = useCallback(() => {
    if (isBookmarked) {
      navPlugin.removeBookmark(currentURI);
    } else {
      navPlugin.addBookmark({
        uri: currentURI,
        commonName: null,
      });
    }
  }, [navPlugin, currentURI, isBookmarked]);

  const bookmarkButton = isBookmarked ? (
    <StarFilled onClick={handleBookmarkClick} />
  ) : (
    <StarOutlined onClick={handleBookmarkClick} />
  );

  return (
    <AutoComplete
      value={currentURI}
      onSelect={navPlugin.navigateTo}
      options={Array.from(bookmarks.values()).map((bookmark) => ({
        value: bookmark.uri,
        label: bookmark.commonName
          ? `${bookmark.commonName} - ${bookmark.uri}`
          : bookmark.uri,
      }))}>
      <Input
        addonAfter={bookmarkButton}
        defaultValue="<select a bookmark>"
        value={currentURI}
        onChange={(e) => {
          navPlugin.currentURI.set(e.target.value);
        }}
        onPressEnter={(e) => {
          navPlugin.navigateTo(currentURI);
        }}
      />
    </AutoComplete>
  );
}

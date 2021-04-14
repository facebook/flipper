/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useMemo} from 'react';
import {AutoComplete, Input, Typography} from 'antd';
import {StarFilled, StarOutlined} from '@ant-design/icons';
import {useStore} from '../../utils/useStore';
import {
  Layout,
  NUX,
  TrackingScope,
  useTrackedCallback,
  useValue,
} from 'flipper-plugin';
import {State} from '../../reducers';

// eslint-disable-next-line flipper/no-relative-imports-across-packages
import type {NavigationPlugin} from '../../../../plugins/public/navigation/index';
import {useMemoize} from 'flipper-plugin';
import styled from '@emotion/styled';

const {Text} = Typography;

export function BookmarkSection() {
  const navPlugin = useStore(navPluginStateSelector);

  return navPlugin ? (
    <TrackingScope scope="bookmarks">
      <NUX
        title="Use bookmarks to directly navigate to a location in the app."
        placement="right">
        <BookmarkSectionInput navPlugin={navPlugin} />
      </NUX>
    </TrackingScope>
  ) : null;
}

function BookmarkSectionInput({navPlugin}: {navPlugin: NavigationPlugin}) {
  const currentURI = useValue(navPlugin.currentURI);
  const bookmarks = useValue(navPlugin.bookmarks);
  const patterns = useValue(navPlugin.appMatchPatterns);

  const isBookmarked = useMemo(() => bookmarks.has(currentURI), [
    bookmarks,
    currentURI,
  ]);

  const autoCompleteItems = useMemoize(
    navPlugin.getAutoCompleteAppMatchPatterns,
    [currentURI, bookmarks, patterns, 20],
  );

  const handleBookmarkClick = useTrackedCallback(
    'bookmark',
    () => {
      if (isBookmarked) {
        navPlugin.removeBookmark(currentURI);
      } else if (currentURI) {
        navPlugin.addBookmark({
          uri: currentURI,
          commonName: null,
        });
      }
    },
    [navPlugin, currentURI, isBookmarked],
  );

  const navigate = useTrackedCallback('navigate', navPlugin.navigateTo, []);

  const bookmarkButton = isBookmarked ? (
    <StarFilled onClick={handleBookmarkClick} />
  ) : (
    <StarOutlined onClick={handleBookmarkClick} />
  );

  return (
    <StyledAutoComplete
      dropdownMatchSelectWidth={500}
      value={currentURI}
      onSelect={navigate}
      style={{flex: 1}}
      options={[
        {
          label: <Text strong>Bookmarks</Text>,
          options: Array.from(bookmarks.values()).map((bookmark) => ({
            value: bookmark.uri,
            label: (
              <NavigationEntry label={bookmark.commonName} uri={bookmark.uri} />
            ),
          })),
        },
        {
          label: <Text strong>Entry points</Text>,
          options: autoCompleteItems.map((value) => ({
            value: value.pattern,
            label: (
              <NavigationEntry label={value.className} uri={value.pattern} />
            ),
          })),
        },
      ]}>
      <Input
        addonAfter={bookmarkButton}
        defaultValue="<select a bookmark>"
        value={currentURI}
        onChange={(e) => {
          navPlugin.currentURI.set(e.target.value);
        }}
        onPressEnter={() => {
          navigate(currentURI);
        }}
      />
    </StyledAutoComplete>
  );
}

function NavigationEntry({label, uri}: {label: string | null; uri: string}) {
  return (
    <Layout.Container>
      <Text>{label ?? uri}</Text>
      <Text type="secondary">{uri}</Text>
    </Layout.Container>
  );
}

const StyledAutoComplete = styled(AutoComplete)({
  display: 'flex',
  flex: 1,
  '.ant-select-selector': {
    flex: 1,
  },
});

const NAVIGATION_PLUGIN_ID = 'Navigation';

function navPluginStateSelector(state: State) {
  const {selectedApp, clients} = state.connections;
  if (!selectedApp) return undefined;
  const client = clients.find((client) => client.id === selectedApp);
  if (!client) return undefined;
  return client.sandyPluginStates.get(NAVIGATION_PLUGIN_ID)?.instanceApi as
    | undefined
    | NavigationPlugin;
}

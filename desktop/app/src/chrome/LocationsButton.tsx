/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useCallback, useEffect} from 'react';
import {platform} from 'os';
import {useValue} from 'flipper-plugin';
import {Button, styled} from '../ui';
import {useStore} from '../utils/useStore';
import {useMemoize} from '../utils/useMemoize';
import {State} from '../reducers';

// TODO T71355623
// eslint-disable-next-line flipper/no-relative-imports-across-packages
import type {NavigationPlugin} from '../../../plugins/navigation/index';
// eslint-disable-next-line flipper/no-relative-imports-across-packages
import type {Bookmark} from '../../../plugins/navigation/types';

const DropdownButton = styled(Button)({
  fontSize: 11,
});

const shortenText = (text: string, MAX_CHARACTERS = 30): string => {
  if (text.length <= MAX_CHARACTERS) {
    return text;
  } else {
    return text.split('').slice(0, MAX_CHARACTERS).join('') + '...';
  }
};

const NAVIGATION_PLUGIN_ID = 'Navigation';

export function LocationsButton() {
  const navPlugin = useStore(navPluginStateSelector);
  return navPlugin ? (
    <ActiveLocationsButton navPlugin={navPlugin} />
  ) : (
    <DropdownButton compact={true}>(none)</DropdownButton>
  );
}

function ActiveLocationsButton({navPlugin}: {navPlugin: NavigationPlugin}) {
  const currentURI = useValue(navPlugin.currentURI);
  const bookmarks = useValue(navPlugin.bookmarks);

  const keyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        ((platform() === 'darwin' && e.metaKey) ||
          (platform() !== 'darwin' && e.ctrlKey)) &&
        /^\d$/.test(e.key) &&
        bookmarks.size >= parseInt(e.key, 10)
      ) {
        navPlugin.navigateTo(
          Array.from(bookmarks.values())[parseInt(e.key, 10) - 1].uri,
        );
      }
    },
    [bookmarks, navPlugin],
  );

  useEffect(() => {
    document.addEventListener('keydown', keyDown);
    return () => {
      document.removeEventListener('keydown', keyDown);
    };
  }, [keyDown]);

  const dropdown = useMemoize(computeBookmarkDropdown, [
    navPlugin,
    bookmarks,
    currentURI,
  ]);

  return (
    <DropdownButton compact={true} dropdown={dropdown}>
      {(currentURI && shortenText(currentURI)) || '(none)'}
    </DropdownButton>
  );
}

export function navPluginStateSelector(state: State) {
  const {selectedApp, clients} = state.connections;
  if (!selectedApp) return undefined;
  const client = clients.find((client) => client.id === selectedApp);
  if (!client) return undefined;
  return client.sandyPluginStates.get(NAVIGATION_PLUGIN_ID)?.instanceApi as
    | undefined
    | NavigationPlugin;
}

function computeBookmarkDropdown(
  navPlugin: NavigationPlugin,
  bookmarks: Map<string, Bookmark>,
  currentURI: string,
) {
  const dropdown: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Bookmarks',
      enabled: false,
    },
    ...Array.from(bookmarks.values()).map((bookmark, i) => {
      return {
        click: () => {
          navPlugin.navigateTo(bookmark.uri);
        },
        accelerator: i < 9 ? `CmdOrCtrl+${i + 1}` : undefined,
        label: shortenText(
          (bookmark.commonName ? bookmark.commonName + ' - ' : '') +
            bookmark.uri,
          100,
        ),
      };
    }),
  ];

  if (currentURI) {
    dropdown.push(
      {type: 'separator'},
      {
        label: 'Bookmark Current Location',
        click: () => {
          navPlugin.addBookmark({
            uri: currentURI,
            commonName: null,
          });
        },
      },
    );
  }
  return dropdown;
}

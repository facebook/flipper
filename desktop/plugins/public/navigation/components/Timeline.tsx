/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {NavigationInfoBox} from './';
import {Bookmark, NavigationEvent, URI} from '../types';
import React, {useRef} from 'react';
import {theme, Layout, styled} from 'flipper-plugin';

type Props = {
  bookmarks: Map<string, Bookmark>;
  events: Array<NavigationEvent>;
  onNavigate: (uri: URI) => void;
  onFavorite: (uri: URI) => void;
};

const TimelineLine = styled.div({
  width: 2,
  backgroundColor: theme.textColorActive,
  position: 'absolute',
  top: 38,
  bottom: 0,
});

const NavigationEventContainer = styled.div({
  display: 'flex',
  paddingTop: 25,
  paddingLeft: 25,
  marginRight: 25,
});

export function Timeline(props: Props) {
  const {bookmarks, events, onNavigate, onFavorite} = props;
  const timelineRef = useRef<HTMLDivElement>(null);
  return events.length === 0 ? (
    <Layout.Container
      center
      grow
      style={{
        fontSize: 18,
        backgroundColor: theme.backgroundWash,
        color: theme.textColorSecondary,
      }}>
      No Navigation Events to Show
    </Layout.Container>
  ) : (
    <Layout.ScrollContainer ref={timelineRef}>
      <Layout.Container grow style={{paddingBottom: 25, paddingLeft: 25}}>
        <TimelineLine />
        {events.map((event: NavigationEvent, idx: number) => {
          return (
            <NavigationEventContainer key={idx}>
              <NavigationInfoBox
                isBookmarked={
                  event.uri != null ? bookmarks.has(event.uri) : false
                }
                className={event.className}
                uri={event.uri}
                onNavigate={(uri) => {
                  if (timelineRef.current != null) {
                    timelineRef.current.scrollTo(0, 0);
                  }
                  onNavigate(uri);
                }}
                onFavorite={onFavorite}
                screenshot={event.screenshot}
                date={event.date}
              />
            </NavigationEventContainer>
          );
        })}
      </Layout.Container>
    </Layout.ScrollContainer>
  );
}

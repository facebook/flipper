/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {colors, FlexCenter, styled} from 'flipper';
import {NavigationInfoBox} from './';
import {Bookmark, NavigationEvent, URI} from '../types';
import React, {useRef} from 'react';

type Props = {
  bookmarks: Map<string, Bookmark>;
  events: Array<NavigationEvent>;
  onNavigate: (uri: URI) => void;
  onFavorite: (uri: URI) => void;
};

const TimelineContainer = styled('div')({
  overflowY: 'scroll',
  flexGrow: 1,
  backgroundColor: colors.light02,
  scrollBehavior: 'smooth',
});

const NavigationEventContainer = styled('div')({
  display: 'flex',
  margin: 20,
});

const NoData = styled(FlexCenter)({
  height: '100%',
  fontSize: 18,
  backgroundColor: colors.macOSTitleBarBackgroundBlur,
  color: colors.macOSTitleBarIcon,
});

export default (props: Props) => {
  const {bookmarks, events, onNavigate, onFavorite} = props;
  const timelineRef = useRef<HTMLDivElement>(null);
  return events.length === 0 ? (
    <NoData>No Navigation Events to Show</NoData>
  ) : (
    <TimelineContainer innerRef={timelineRef}>
      {events.map((event: NavigationEvent, idx: number) => {
        return (
          <NavigationEventContainer>
            <NavigationInfoBox
              key={idx}
              isBookmarked={
                event.uri != null ? bookmarks.has(event.uri) : false
              }
              className={event.className}
              uri={event.uri}
              onNavigate={uri => {
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
    </TimelineContainer>
  );
};

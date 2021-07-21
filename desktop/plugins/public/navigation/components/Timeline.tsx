/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlexCenter, styled} from 'flipper';
import {NavigationInfoBox} from './';
import {Bookmark, NavigationEvent, URI} from '../types';
import React, {useRef} from 'react';
import {theme} from 'flipper-plugin';

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

const TimelineContainer = styled.div({
  position: 'relative',
  paddingLeft: 25,
  overflowY: 'scroll',
  flexGrow: 1,
  backgroundColor: theme.backgroundWash,
  scrollBehavior: 'smooth',
  '&>div': {
    position: 'relative',
    minHeight: '100%',
    '&:last-child': {
      paddingBottom: 25,
    },
  },
});

const NavigationEventContainer = styled.div({
  display: 'flex',
  paddingTop: 25,
  paddingLeft: 25,
  marginRight: 25,
});

const NoData = styled(FlexCenter)({
  height: '100%',
  fontSize: 18,
  backgroundColor: theme.backgroundWash,
  color: theme.textColorSecondary,
});

export function Timeline(props: Props) {
  const {bookmarks, events, onNavigate, onFavorite} = props;
  const timelineRef = useRef<HTMLDivElement>(null);
  return events.length === 0 ? (
    <NoData>No Navigation Events to Show</NoData>
  ) : (
    <TimelineContainer ref={timelineRef}>
      <div>
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
      </div>
    </TimelineContainer>
  );
}

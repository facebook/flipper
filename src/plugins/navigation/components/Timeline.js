/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import {styled} from 'flipper';
import {NavigationInfoBox} from './';

import type {NavigationEvent} from '../';

type Props = {|
  events: Array<NavigationEvent>,
  onNavigate: string => void,
|};

const TimelineContainer = styled('div')({
  overflowY: 'scroll',
  flexGrow: 1,
});

export default (props: Props) => {
  return (
    <TimelineContainer>
      {props.events.map((event: NavigationEvent) => {
        return (
          <NavigationInfoBox
            uri={event.uri}
            onNavigate={props.onNavigate}
            onFavorite={() => {}} // stubbed for now
          />
        );
      })}
    </TimelineContainer>
  );
};

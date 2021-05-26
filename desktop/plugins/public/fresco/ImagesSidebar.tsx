/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ImageData} from './api';
import {ImageEventWithId} from './index';
import React, {Component} from 'react';
import {
  Layout,
  theme,
  styled,
  DataDescription,
  Panel,
  DataInspector,
} from 'flipper-plugin';

type ImagesSidebarProps = {
  image: ImageData;
  events: Array<ImageEventWithId>;
};

type ImagesSidebarState = {};

const DataDescriptionKey = styled.span({
  color: theme.textColorPrimary,
});

const WordBreakFlexColumn = styled(Layout.Container)({
  wordBreak: 'break-all',
});

export default class ImagesSidebar extends Component<
  ImagesSidebarProps,
  ImagesSidebarState
> {
  render() {
    return (
      <div>
        {this.renderUri()}
        {this.props.events.map((e) => (
          <EventDetails key={e.eventId} event={e} />
        ))}
      </div>
    );
  }

  renderUri() {
    if (!this.props.image) {
      return null;
    }
    if (!this.props.image.uri) {
      return null;
    }

    return (
      <Panel title="Sources" pad>
        <WordBreakFlexColumn>
          <span>
            URI<span key="sep">: </span>
            <DataDescription
              type="string"
              value={this.props.image.uri}
              setValue={null}
            />
          </span>
        </WordBreakFlexColumn>
      </Panel>
    );
  }
}
class EventDetails extends Component<{
  event: ImageEventWithId;
}> {
  render() {
    const {event} = this.props;

    return (
      <Panel title={requestHeader(event)} pad>
        <p>
          <DataDescriptionKey>Attribution</DataDescriptionKey>
          <span key="sep">: </span>
          <DataInspector data={event.attribution} />
        </p>
        <p>
          <DataDescriptionKey>Time start</DataDescriptionKey>
          <span key="sep">: </span>
          <DataDescription
            type="number"
            value={event.startTime}
            setValue={null}
          />
        </p>
        <p>
          <DataDescriptionKey>Time end</DataDescriptionKey>
          <span key="sep">: </span>
          <DataDescription
            type="number"
            value={event.endTime}
            setValue={null}
          />
        </p>
        <p>
          <DataDescriptionKey>Source</DataDescriptionKey>
          <span key="sep">: </span>
          <DataDescription type="string" value={event.source} setValue={null} />
        </p>
        <p>
          <DataDescriptionKey>Requested on cold start</DataDescriptionKey>
          <span key="sep">: </span>
          <DataDescription
            type="boolean"
            value={event.coldStart}
            setValue={null}
          />
        </p>
        {this.renderViewportData()}
      </Panel>
    );
  }

  renderViewportData() {
    const viewport = this.props.event.viewport;
    if (!viewport) {
      return null;
    }
    return (
      <p>
        <DataDescriptionKey>Viewport</DataDescriptionKey>
        <span key="sep">: </span>
        <DataDescription
          type="string"
          value={viewport.width + 'x' + viewport.height}
          setValue={null}
        />
      </p>
    );
    // TODO (t31947746): grey box time, n-th scan time
  }
}

function requestHeader(event: ImageEventWithId) {
  const date = new Date(event.startTime);
  const dateString = `${date.toTimeString().split(' ')[0]}.${(
    '000' + date.getMilliseconds()
  ).substr(-3)}`;

  return (event.viewport ? 'Request' : 'Prefetch') + ' at ' + dateString;
}

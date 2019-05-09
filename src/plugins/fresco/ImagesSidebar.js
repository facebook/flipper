/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {ImageData} from './api.js';
import type {ImageEventWithId} from './index.js';
import {
  Component,
  DataDescription,
  Text,
  Panel,
  ManagedDataInspector,
  colors,
  styled,
} from 'flipper';

type ImagesSidebarProps = {
  image: ?ImageData,
  events: Array<ImageEventWithId>,
};

type ImagesSidebarState = {};

const DataDescriptionKey = styled('span')({
  color: colors.grapeDark1,
});

export default class ImagesSidebar extends Component<
  ImagesSidebarProps,
  ImagesSidebarState,
> {
  render() {
    return (
      <div>
        {this.renderUri()}
        {this.props.events.map(e => (
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
      <p>
        <DataDescriptionKey>URI</DataDescriptionKey>
        <span key="sep">: </span>
        <DataDescription
          type="string"
          value={this.props.image.uri}
          setValue={function(path: Array<string>, val: any) {}}
        />
      </p>
    );
  }
}

class EventDetails extends Component<{
  event: ImageEventWithId,
}> {
  static Container = styled(Panel)({
    flexShrink: 0,
    marginTop: '15px',
  });

  render() {
    const {event} = this.props;

    return (
      <EventDetails.Container
        heading={<RequestHeader event={event} />}
        floating={false}
        padded={false}
        grow={false}
        collapsed={false}>
        <p>
          <DataDescriptionKey>Attribution</DataDescriptionKey>
          <span key="sep">: </span>
          <ManagedDataInspector data={event.attribution} />
        </p>
        <p>
          <DataDescriptionKey>Time start</DataDescriptionKey>
          <span key="sep">: </span>
          <DataDescription
            type="number"
            value={event.startTime}
            setValue={function(path: Array<string>, val: any) {}}
          />
        </p>
        <p>
          <DataDescriptionKey>Time end</DataDescriptionKey>
          <span key="sep">: </span>
          <DataDescription
            type="number"
            value={event.endTime}
            setValue={function(path: Array<string>, val: any) {}}
          />
        </p>
        <p>
          <DataDescriptionKey>Source</DataDescriptionKey>
          <span key="sep">: </span>
          <DataDescription
            type="string"
            value={event.source}
            setValue={function(path: Array<string>, val: any) {}}
          />
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
      </EventDetails.Container>
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
          setValue={function(path: Array<string>, val: any) {}}
        />
      </p>
    );
    // TODO (t31947746): grey box time, n-th scan time
  }
}

class RequestHeader extends Component<{
  event: ImageEventWithId,
}> {
  dateString = timestamp => {
    const date = new Date(timestamp);
    return `${date.toTimeString().split(' ')[0]}.${(
      '000' + date.getMilliseconds()
    ).substr(-3)}`;
  };

  render() {
    const {event} = this.props;
    const durationMs = event.endTime - event.startTime;
    return (
      <Text>
        {event.viewport ? 'Request' : 'Prefetch'} at{' '}
        {this.dateString(event.startTime)} ({durationMs}ms)
      </Text>
    );
  }
}

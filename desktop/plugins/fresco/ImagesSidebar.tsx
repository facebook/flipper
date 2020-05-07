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
import {
  Component,
  ContextMenu,
  DataDescription,
  Text,
  Panel,
  ManagedDataInspector,
  FlexColumn,
  FlexRow,
  colors,
  styled,
} from 'flipper';
import React from 'react';
import {clipboard, MenuItemConstructorOptions} from 'electron';

type ImagesSidebarProps = {
  image: ImageData;
  events: Array<ImageEventWithId>;
};

type ImagesSidebarState = {};

const DataDescriptionKey = styled.span({
  color: colors.grapeDark1,
});

const WordBreakFlexColumn = styled(FlexColumn)({
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

    const contextMenuItems: MenuItemConstructorOptions[] = [
      {
        label: 'Copy URI',
        click: () => clipboard.writeText(this.props.image.uri!),
      },
    ];

    return (
      <Panel heading="Sources" floating={false}>
        <FlexRow>
          <FlexColumn>
            <DataDescriptionKey>URI</DataDescriptionKey>
          </FlexColumn>
          <FlexColumn>
            <span key="sep">:&nbsp;</span>
          </FlexColumn>
          <WordBreakFlexColumn>
            <ContextMenu component="span" items={contextMenuItems}>
              <DataDescription
                type="string"
                value={this.props.image.uri}
                setValue={null}
              />
            </ContextMenu>
          </WordBreakFlexColumn>
        </FlexRow>
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
      <Panel
        heading={<RequestHeader event={event} />}
        floating={false}
        padded={true}>
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

class RequestHeader extends Component<{
  event: ImageEventWithId;
}> {
  dateString = (timestamp: number) => {
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

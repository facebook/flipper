/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  DataInspector,
  Layout,
  theme,
  TimelineDataDescription,
} from 'flipper-plugin';
import {FrameworkEvent, ClientNode} from '../../../ClientTypes';
import React, {ReactNode} from 'react';
import {StackTraceInspector} from './StackTraceInspector';
import {Descriptions, Tag} from 'antd';
import {frameworkEventSeparator} from '../../shared/FrameworkEventsTreeSelect';

type Props = {
  node: ClientNode;
  events: readonly FrameworkEvent[];
  showExtra?: (title: string, element: ReactNode) => void;
};
export const FrameworkEventsInspector: React.FC<Props> = ({
  node,
  events,
  showExtra,
}) => {
  return (
    <TimelineDataDescription
      key={node.id}
      canSetCurrent={false}
      onClick={(current) => {
        const idx = parseInt(current, 10);
        const event = events[idx];
        showExtra?.(
          'Event details',
          <EventDetails event={event} node={node} />,
        );
      }}
      timeline={{
        time: events.map((event, idx) => {
          return {
            moment: event.timestamp,
            display: `${eventTypeToName(event.type)}`,
            color: threadToColor(event.thread),
            key: idx.toString(),
          };
        }),
        current: 'initialNone',
      }}
    />
  );
};

function EventDetails({
  event,
  node,
}: {
  event: FrameworkEvent;
  node: ClientNode;
}) {
  const stackTrace =
    event?.attribution?.type === 'stacktrace' ? (
      <StackTraceInspector
        stacktrace={event.attribution.stacktrace}
        tags={node.tags}
      />
    ) : null;

  const details = (
    <Layout.Container>
      <Descriptions size="small" bordered column={1}>
        <Descriptions.Item label="Event type">{event.type}</Descriptions.Item>
        <Descriptions.Item label="Thread">
          <Tag color={threadToColor(event.thread)}>{event.thread}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Timestamp">
          {formatTimestamp(event.timestamp)}
        </Descriptions.Item>
        {event.duration && (
          <Descriptions.Item label="Duration">
            {formatDuration(event.duration)}
          </Descriptions.Item>
        )}
        {event.payload && Object.keys(event.payload).length > 0 && (
          <Descriptions.Item label="Attributes">
            <DataInspector data={event.payload} />
          </Descriptions.Item>
        )}
      </Descriptions>
    </Layout.Container>
  );

  return (
    <Layout.Horizontal>
      {details}
      {stackTrace}
    </Layout.Horizontal>
  );
}

const options: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  hour12: false,
};
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);

  const formattedDate = new Intl.DateTimeFormat('en-US', options).format(date);
  const milliseconds = date.getMilliseconds();

  return `${formattedDate}.${milliseconds.toString().padStart(3, '0')}`;
}

function formatDuration(nanoseconds: number): string {
  if (nanoseconds < 1_000) {
    return `${nanoseconds} nanoseconds`;
  } else if (nanoseconds < 1_000_000) {
    return `${(nanoseconds / 1_000).toFixed(2)} microseconds`;
  } else if (nanoseconds < 1_000_000_000) {
    return `${(nanoseconds / 1_000_000).toFixed(2)} milliseconds`;
  } else if (nanoseconds < 1_000_000_000_000) {
    return `${(nanoseconds / 1_000_000_000).toFixed(2)} seconds`;
  } else {
    return `${(nanoseconds / 1_000_000_000_000).toFixed(2)} minutes`;
  }
}
function eventTypeToName(eventType: string) {
  return eventType.slice(eventType.lastIndexOf(frameworkEventSeparator) + 1);
}

function threadToColor(thread?: string) {
  return thread === 'main' ? theme.warningColor : theme.primaryColor;
}

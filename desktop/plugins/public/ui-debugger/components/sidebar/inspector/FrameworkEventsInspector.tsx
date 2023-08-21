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
  produce,
  theme,
  TimelineDataDescription,
} from 'flipper-plugin';
import {
  FrameworkEvent,
  ClientNode,
  FrameworkEventType,
  FrameworkEventMetadata,
} from '../../../ClientTypes';
import React, {ReactNode, useState} from 'react';
import {StackTraceInspector} from './StackTraceInspector';
import {Button, Collapse, Descriptions, Select, Tag} from 'antd';
import {frameworkEventSeparator} from '../../shared/FrameworkEventsTreeSelect';
import {
  buildTreeSelectData,
  FrameworkEventsTreeSelect,
} from '../../shared/FrameworkEventsTreeSelect';
import {uniqBy} from 'lodash';
import {TableOutlined} from '@ant-design/icons';
import {ViewMode} from '../../../DesktopTypes';

type Props = {
  node: ClientNode;
  events: readonly FrameworkEvent[];
  showExtra?: (title: string, element: ReactNode) => void;
  frameworkEventMetadata: Map<FrameworkEventType, FrameworkEventMetadata>;
  onSetViewMode: (viewMode: ViewMode) => void;
};
export const FrameworkEventsInspector: React.FC<Props> = ({
  node,
  events,
  showExtra,
  frameworkEventMetadata,
  onSetViewMode,
}) => {
  const allThreads = uniqBy(events, 'thread').map((event) => event.thread);
  const [filteredThreads, setFilteredThreads] = useState<Set<string>>(
    new Set(),
  );

  const allEventTypes = uniqBy(events, 'type').map((event) => event.type);
  const [filteredEventTypes, setFilteredEventTypes] = useState<Set<string>>(
    new Set(),
  );

  const filteredEvents = events
    .filter(
      (event) =>
        filteredEventTypes.size === 0 || filteredEventTypes.has(event.type),
    )
    .filter(
      (event) =>
        filteredThreads.size === 0 || filteredThreads.has(event.thread!),
    );

  return (
    <Layout.Container gap="small" padv="small">
      {node.tags.includes('TreeRoot') && (
        <Button
          type="ghost"
          icon={<TableOutlined />}
          size="middle"
          onClick={() =>
            onSetViewMode({mode: 'frameworkEventsTable', treeRootId: node.id})
          }>
          Explore all events
        </Button>
      )}
      <Collapse>
        <Collapse.Panel header="Filter events" key="1">
          <Layout.Container gap="tiny">
            <FrameworkEventsTreeSelect
              placeholder="Select events types to filter by"
              treeData={buildTreeSelectData(
                allEventTypes,
                frameworkEventMetadata,
              )}
              width={250}
              onSetEventSelected={(eventType, selected) => {
                setFilteredEventTypes((cur) =>
                  produce(cur, (draft) => {
                    if (selected) {
                      draft.add(eventType);
                    } else {
                      draft.delete(eventType);
                    }
                  }),
                );
              }}
              selected={[...filteredEventTypes]}
            />
            <Select
              mode="multiple"
              style={{width: '250px'}}
              placeholder="Select threads to filter by"
              defaultValue={[] as string[]}
              options={allThreads.map((thread) => ({
                value: thread,
                label: thread,
              }))}
              onChange={(value) => setFilteredThreads(new Set(value))}
            />
          </Layout.Container>
        </Collapse.Panel>
      </Collapse>

      <TimelineDataDescription
        key={node.id}
        canSetCurrent={false}
        onClick={(current) => {
          const idx = parseInt(current, 10);
          const event = filteredEvents[idx];
          showExtra?.(
            'Event details',
            <EventDetails
              frameworkEventMetadata={frameworkEventMetadata.get(event.type)}
              event={event}
              node={node}
            />,
          );
        }}
        timeline={{
          time: filteredEvents.map((event, idx) => {
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
    </Layout.Container>
  );
};

function EventDetails({
  event,
  node,
  frameworkEventMetadata,
}: {
  frameworkEventMetadata?: FrameworkEventMetadata;
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
        {frameworkEventMetadata && (
          <Descriptions.Item label="Event documentation">
            {frameworkEventMetadata?.documentation}
          </Descriptions.Item>
        )}

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

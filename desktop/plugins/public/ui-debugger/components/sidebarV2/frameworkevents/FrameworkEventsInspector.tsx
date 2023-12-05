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
import {
  Badge,
  Button,
  Descriptions,
  Dropdown,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {frameworkEventSeparator} from '../../shared/FrameworkEventsTreeSelect';
import {last, startCase, uniqBy} from 'lodash';
import {FilterOutlined, TableOutlined} from '@ant-design/icons';
import {ViewMode} from '../../../DesktopTypes';
import {MultiSelectableDropDownItem} from '../../shared/MultiSelectableDropDownItem';
import {formatDuration, formatTimestampMillis} from '../../../utils/timeUtils';
import {tracker} from '../../../utils/tracker';

type Props = {
  node: ClientNode;
  events: readonly FrameworkEvent[];
  showBottomPanel?: (title: string, element: ReactNode) => void;
  frameworkEventMetadata: Map<FrameworkEventType, FrameworkEventMetadata>;
  onSetViewMode: (viewMode: ViewMode) => void;
};

export const FrameworkEventsInspector: React.FC<Props> = ({
  node,
  events,
  showBottomPanel: showExtra,
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

  const showThreadsSection = allThreads.length > 1;
  const showEventTypesSection = allEventTypes.length > 1;
  return (
    <Layout.Container gap="small" padv="small">
      <Layout.Right center gap>
        <Typography.Title level={3}>Event timeline</Typography.Title>

        <Layout.Horizontal center gap padh="medium">
          <Tooltip title="Explore events in table">
            <Button
              shape="circle"
              icon={<TableOutlined />}
              onClick={() =>
                onSetViewMode({
                  mode: 'frameworkEventsTable',
                  nodeId: node.id,
                  isTree: node.tags.includes('TreeRoot'),
                })
              }
            />
          </Tooltip>
          {(showEventTypesSection || showThreadsSection) && (
            <Dropdown
              overlayStyle={{minWidth: 200}}
              onOpenChange={(open) => {
                if (open) {
                  tracker.track(
                    'framework-event-timeline-filters-adjusted',
                    {},
                  );
                }
              }}
              dropdownRender={() => (
                <Layout.Container
                  gap="small"
                  pad="small"
                  style={{
                    backgroundColor: theme.white,
                    borderRadius: theme.borderRadius,
                    boxShadow: `0 0 4px 1px rgba(0,0,0,0.10)`,
                  }}>
                  {showThreadsSection && (
                    <>
                      <Typography.Text strong>By thread</Typography.Text>
                      {allThreads.map((thread) => (
                        <MultiSelectableDropDownItem
                          onSelect={(thread, selected) => {
                            setFilteredThreads((cur) =>
                              produce(cur, (draft) => {
                                if (selected) {
                                  draft.add(thread);
                                } else {
                                  draft.delete(thread);
                                }
                              }),
                            );
                          }}
                          selectedValues={filteredThreads}
                          key={thread}
                          value={thread as string}
                          text={startCase(thread) as string}
                        />
                      ))}
                    </>
                  )}

                  {showEventTypesSection && (
                    <>
                      <Typography.Text strong>By event type</Typography.Text>
                      {allEventTypes.map((eventType) => (
                        <MultiSelectableDropDownItem
                          onSelect={(eventType, selected) => {
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
                          selectedValues={filteredEventTypes}
                          key={eventType}
                          value={eventType as string}
                          text={last(eventType.split('.')) as string}
                        />
                      ))}
                    </>
                  )}
                </Layout.Container>
              )}>
              <Button
                shape="circle"
                icon={
                  <Badge
                    offset={[8, -8]}
                    size="small"
                    count={filteredEventTypes.size + filteredThreads.size}>
                    <FilterOutlined style={{}} />
                  </Badge>
                }
              />
            </Dropdown>
          )}
        </Layout.Horizontal>
      </Layout.Right>

      <TimelineDataDescription
        key={node.id}
        canSetCurrent={false}
        onClick={(current) => {
          const idx = parseInt(current, 10);
          const event = filteredEvents[idx];
          tracker.track('framework-event-timeline-event-selected', {
            eventType: event.type,
          });
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
          {formatTimestampMillis(event.timestamp)}
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

export const options: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  hour12: false,
};

export function eventTypeToName(eventType: string) {
  return eventType.slice(eventType.lastIndexOf(frameworkEventSeparator) + 1);
}

function threadToColor(thread?: string) {
  return thread === 'main' ? theme.warningColor : theme.primaryColor;
}

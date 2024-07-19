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
  usePlugin,
  useValue,
} from 'flipper-plugin';
import {
  FrameworkEvent,
  ClientNode,
  FrameworkEventType,
  FrameworkEventMetadata,
} from '../../../ClientTypes';
import React, {ReactNode} from 'react';
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
import {startCase, uniq} from 'lodash';
import {DeleteOutlined, FilterOutlined, TableOutlined} from '@ant-design/icons';
import {ViewMode} from '../../../DesktopTypes';
import {MultiSelectableDropDownItem} from '../../shared/MultiSelectableDropDownItem';
import {formatDuration, formatTimestampMillis} from '../../../utils/timeUtils';
import {tracker} from '../../../utils/tracker';
import {plugin} from '../../../index';
import {CustomDropDown} from '../../shared/CustomDropDown';

type Props = {
  node: ClientNode;
  events: readonly FrameworkEvent[];
  showBottomPanel?: (title: string, element: ReactNode) => void;
  frameworkEventMetadata: Map<FrameworkEventType, FrameworkEventMetadata>;
  onSetViewMode: (viewMode: ViewMode) => void;
  clearAllEvents: () => void;
};

export const FrameworkEventsInspector: React.FC<Props> = ({
  node,
  events,
  showBottomPanel: showExtra,
  frameworkEventMetadata,
  onSetViewMode,
  clearAllEvents,
}) => {
  const instance = usePlugin(plugin);
  const filters = useValue(instance.uiState.nodeLevelFrameworkEventFilters);

  const allThreads = uniq([
    ...events.map((e) => e.thread),
    ...filters.threads.values(),
  ]);

  const allEventTypes = uniq([
    ...events.map((e) => e.type),
    ...filters.eventTypes.values(),
  ]);

  const filteredEvents = events
    .filter(
      (event) =>
        filters.eventTypes.size === 0 || filters.eventTypes.has(event.type),
    )
    .filter(
      (event) =>
        filters.threads.size === 0 ||
        filters.threads.has(event.thread ?? 'nothread'),
    );

  const showThreadsSection = allThreads.length > 1;
  const showEventTypesSection = allEventTypes.length > 1;
  return (
    <Layout.Container gap="small" padv="small">
      <Layout.Right center gap>
        <Typography.Title level={3}>Event timeline</Typography.Title>

        <Layout.Horizontal center gap padh="medium">
          <Tooltip title="Clear all events">
            <Button
              shape="circle"
              icon={<DeleteOutlined />}
              onClick={clearAllEvents}
            />
          </Tooltip>
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
                <CustomDropDown>
                  {showThreadsSection && (
                    <>
                      <Typography.Text
                        style={{padding: theme.space.small}}
                        strong>
                        By thread
                      </Typography.Text>
                      {allThreads.map((thread) => (
                        <MultiSelectableDropDownItem
                          onSelect={(thread, selected) => {
                            instance.uiActions.onChangeNodeLevelThreadFilter(
                              thread,
                              selected ? 'add' : 'remove',
                            );
                          }}
                          selectedValues={filters.threads}
                          key={thread}
                          value={thread as string}
                          text={startCase(thread) as string}
                        />
                      ))}
                    </>
                  )}

                  {showEventTypesSection && (
                    <>
                      <Typography.Text
                        strong
                        style={{padding: theme.space.small}}>
                        By event type
                      </Typography.Text>
                      {allEventTypes.map((eventType) => (
                        <MultiSelectableDropDownItem
                          onSelect={(eventType, selected) => {
                            instance.uiActions.onChangeNodeLevelEventTypeFilter(
                              eventType,
                              selected ? 'add' : 'remove',
                            );
                          }}
                          selectedValues={filters.eventTypes}
                          key={eventType}
                          value={eventType as string}
                          text={eventTypeToName(eventType)}
                        />
                      ))}
                    </>
                  )}
                </CustomDropDown>
              )}>
              <Button
                shape="circle"
                icon={
                  <Badge
                    offset={[8, -8]}
                    size="small"
                    count={filters.eventTypes.size + filters.threads.size}>
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
  //drop the first prefix
  return eventType.slice(eventType.indexOf(frameworkEventSeparator) + 1);
}

function threadToColor(thread?: string) {
  return thread === 'main' ? theme.warningColor : theme.primaryColor;
}

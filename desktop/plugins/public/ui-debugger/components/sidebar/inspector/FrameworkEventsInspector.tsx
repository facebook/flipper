/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button} from 'antd';
import {theme, TimelineDataDescription} from 'flipper-plugin';
import {FrameworkEvent, ClientNode} from '../../../ClientTypes';
import React, {ReactNode, useState} from 'react';
import {StackTraceInspector} from './StackTraceInspector';

type Props = {
  node: ClientNode;
  events: readonly FrameworkEvent[];
  showExtra?: (element: ReactNode) => void;
};
export const FrameworkEventsInspector: React.FC<Props> = ({
  node,
  events,
  showExtra,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<FrameworkEvent>(
    events[events.length - 1],
  );

  const showStacktrace = () => {
    const attribution = selectedEvent.attribution;
    if (attribution?.type === 'stacktrace') {
      const stacktraceInspector = (
        <StackTraceInspector
          stacktrace={attribution.stacktrace}
          tags={node.tags}
        />
      );
      showExtra?.(stacktraceInspector);
    }
  };

  const hasStacktrace = (event: FrameworkEvent) => {
    return event?.attribution?.type === 'stacktrace';
  };

  return (
    <>
      <TimelineDataDescription
        key={node.id}
        canSetCurrent={false}
        onClick={(current) => {
          const idx = parseInt(current, 10);
          setSelectedEvent(events[idx]);
        }}
        timeline={{
          time: events.map((e, idx) => {
            return {
              moment: e.timestamp,
              display: e.type.slice(e.type.lastIndexOf(':') + 1),
              color: theme.primaryColor,
              key: idx.toString(),
              properties: e.payload as any,
            };
          }),
          current: (events.length - 1).toString(),
        }}
      />
      {hasStacktrace(selectedEvent) && (
        <Button type="ghost" onClick={showStacktrace}>
          Stacktrace
        </Button>
      )}
    </>
  );
};

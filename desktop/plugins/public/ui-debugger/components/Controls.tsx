/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useState} from 'react';
import {plugin} from '../index';
import {
  Button,
  Input,
  Modal,
  Tooltip,
  Typography,
  TreeSelect,
  Space,
  Switch,
} from 'antd';
import {
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {usePlugin, useValue, Layout} from 'flipper-plugin';
import {FrameworkEventType} from '../types';
import {tracker} from '../utils/tracker';
import {debounce} from 'lodash';

const searchTermUpdated = debounce((searchTerm: string) => {
  tracker.track('search-term-updated', {searchTerm});
}, 250);

export const Controls: React.FC = () => {
  const instance = usePlugin(plugin);
  const searchTerm = useValue(instance.uiState.searchTerm);
  const isPaused = useValue(instance.uiState.isPaused);
  const filterMainThreadMonitoring = useValue(
    instance.uiState.filterMainThreadMonitoring,
  );

  const frameworkEventMonitoring: Map<FrameworkEventType, boolean> = useValue(
    instance.uiState.frameworkEventMonitoring,
  );

  const [showFrameworkEventsModal, setShowFrameworkEventsModal] =
    useState(false);

  const onSetEventMonitored: (
    eventType: FrameworkEventType,
    monitored: boolean,
  ) => void = (eventType: FrameworkEventType, monitored: boolean) => {
    tracker.track('framework-event-monitored', {eventType, monitored});
    instance.uiState.frameworkEventMonitoring.update((draft) =>
      draft.set(eventType, monitored),
    );
  };

  return (
    <Layout.Horizontal pad="small" gap="small">
      <Input
        value={searchTerm}
        onChange={(e) => {
          instance.uiState.searchTerm.set(e.target.value);
          searchTermUpdated(e.target.value);
        }}
        prefix={<SearchOutlined />}
        placeholder="Search"
      />
      <Button
        type="default"
        shape="circle"
        onClick={() => {
          const isPaused = !instance.uiState.isPaused.get();
          tracker.track('play-pause-toggled', {paused: isPaused});
          instance.setPlayPause(isPaused);
        }}
        icon={
          <Tooltip
            title={isPaused ? 'Resume live updates' : 'Pause incoming updates'}>
            {isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
          </Tooltip>
        }></Button>
      <Button
        type="default"
        shape="circle"
        onClick={() => {
          setShowFrameworkEventsModal(true);
        }}
        icon={
          <Tooltip title="Framework event monitoring">
            <EyeOutlined />
          </Tooltip>
        }></Button>
      {frameworkEventMonitoring.size > 0 && (
        <FrameworkEventsMonitoringModal
          filterMainThreadMonitoring={filterMainThreadMonitoring}
          onSetFilterMainThreadMonitoring={
            instance.uiActions.onSetFilterMainThreadMonitoring
          }
          frameworkEventTypes={[...frameworkEventMonitoring.entries()]}
          onSetEventMonitored={onSetEventMonitored}
          visible={showFrameworkEventsModal}
          onCancel={() => setShowFrameworkEventsModal(false)}
        />
      )}
    </Layout.Horizontal>
  );
};

function FrameworkEventsMonitoringModal({
  visible,
  onCancel,
  onSetEventMonitored,
  onSetFilterMainThreadMonitoring,
  filterMainThreadMonitoring,
  frameworkEventTypes,
}: {
  visible: boolean;
  onCancel: () => void;
  onSetEventMonitored: (
    eventType: FrameworkEventType,
    monitored: boolean,
  ) => void;
  filterMainThreadMonitoring: boolean;
  onSetFilterMainThreadMonitoring: (toggled: boolean) => void;
  frameworkEventTypes: [FrameworkEventType, boolean][];
}) {
  const selectedFrameworkEvents = frameworkEventTypes
    .filter(([, selected]) => selected)
    .map(([eventType]) => eventType);

  const treeData = buildTreeSelectData(
    frameworkEventTypes.map(([type]) => type),
  );

  return (
    <Modal
      title="Framework event monitoring"
      visible={visible}
      footer={null}
      onCancel={onCancel}>
      <Space direction="vertical" size="large">
        <Typography.Text>
          Monitoring an event will cause the relevant node in the visualizer and
          tree to highlight briefly. Additionally counter will show the number
          of matching events in the tree
        </Typography.Text>

        <TreeSelect
          treeCheckable
          showSearch={false}
          showCheckedStrategy={TreeSelect.SHOW_PARENT}
          placeholder="Select node types to monitor"
          virtual={false} //for scrollbar
          style={{
            width: '100%',
          }}
          treeData={treeData}
          treeDefaultExpandAll
          value={selectedFrameworkEvents}
          onSelect={(_: any, node: any) => {
            for (const leaf of getAllLeaves(node)) {
              onSetEventMonitored(leaf, true);
            }
          }}
          onDeselect={(_: any, node: any) => {
            for (const leaf of getAllLeaves(node)) {
              onSetEventMonitored(leaf, false);
            }
          }}
        />

        <Layout.Horizontal gap="medium">
          <Switch
            checked={filterMainThreadMonitoring}
            onChange={(event) => {
              onSetFilterMainThreadMonitoring(event);
            }}
          />
          <Typography.Text>
            Only highlight events that occured on the main thread
          </Typography.Text>
        </Layout.Horizontal>
      </Space>
    </Modal>
  );
}

type TreeSelectNode = {
  title: string;
  key: string;
  value: string;
  children: TreeSelectNode[];
};

/**
 * In tree select you can select a parent which implicitly selects all children, we find them all here as the real state
 * is in terms of the leaf nodes
 */
function getAllLeaves(treeSelectNode: TreeSelectNode) {
  const result: string[] = [];
  function getAllLeavesRec(node: TreeSelectNode) {
    if (node.children.length > 0) {
      for (const child of node.children) {
        getAllLeavesRec(child);
      }
    } else {
      result.push(node.key);
    }
  }
  getAllLeavesRec(treeSelectNode);
  return result;
}

/**
 * transformed flat event type data structure into tree
 */
function buildTreeSelectData(eventTypes: string[]): TreeSelectNode[] {
  const root: TreeSelectNode = buildTreeSelectNode('root', 'root');

  eventTypes.forEach((eventType) => {
    const eventSubtypes = eventType.split(':');
    let currentNode = root;

    // Find the parent node for the current id
    for (let i = 0; i < eventSubtypes.length - 1; i++) {
      let foundChild = false;
      for (const child of currentNode.children) {
        if (child.title === eventSubtypes[i]) {
          currentNode = child;
          foundChild = true;
          break;
        }
      }
      if (!foundChild) {
        const newNode: TreeSelectNode = buildTreeSelectNode(
          eventSubtypes[i],
          eventSubtypes.slice(0, i + 1).join(':'),
        );

        currentNode.children.push(newNode);
        currentNode = newNode;
      }
    }
    // Add the current id as a child of the parent node
    currentNode.children.push(
      buildTreeSelectNode(
        eventSubtypes[eventSubtypes.length - 1],
        eventSubtypes.slice(0, eventSubtypes.length).join(':'),
      ),
    );
  });

  return root.children;
}

function buildTreeSelectNode(title: string, fullValue: string): TreeSelectNode {
  return {
    title: title,
    key: fullValue,
    value: fullValue,
    children: [],
  };
}

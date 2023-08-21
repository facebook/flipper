/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useState} from 'react';
import {plugin} from '../../index';
import {Button, Input, Modal, Tooltip, Typography, Space, Switch} from 'antd';
import {
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {usePlugin, useValue, Layout} from 'flipper-plugin';
import {FrameworkEventType} from '../../ClientTypes';
import {
  buildTreeSelectData,
  FrameworkEventsTreeSelect,
} from '../shared/FrameworkEventsTreeSelect';

export const TreeControls: React.FC = () => {
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

  return (
    <Layout.Horizontal gap="medium" pad="medium">
      <Input
        value={searchTerm}
        onChange={(e) => {
          instance.uiActions.onSearchTermUpdated(e.target.value);
        }}
        prefix={<SearchOutlined />}
        placeholder="Search"
      />
      <Button
        type="default"
        shape="circle"
        onClick={instance.uiActions.onPlayPauseToggled}
        icon={
          <Tooltip
            title={isPaused ? 'Resume live updates' : 'Pause incoming updates'}>
            {isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
          </Tooltip>
        }></Button>
      {frameworkEventMonitoring.size > 0 && (
        <>
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
          <FrameworkEventsMonitoringModal
            filterMainThreadMonitoring={filterMainThreadMonitoring}
            onSetFilterMainThreadMonitoring={
              instance.uiActions.onSetFilterMainThreadMonitoring
            }
            frameworkEventTypes={[...frameworkEventMonitoring.entries()]}
            onSetEventMonitored={
              instance.uiActions.onSetFrameworkEventMonitored
            }
            visible={showFrameworkEventsModal}
            onCancel={() => setShowFrameworkEventsModal(false)}
          />
        </>
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

        <FrameworkEventsTreeSelect
          placeholder="Select node types to monitor"
          onSetEventSelected={onSetEventMonitored}
          selected={selectedFrameworkEvents}
          treeData={treeData}
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

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
import {
  Button,
  Input,
  Modal,
  Tooltip,
  Typography,
  Space,
  Switch,
  Badge,
  Dropdown,
  Divider,
} from 'antd';
// TODO: Fix this the next time the file is edited.
// eslint-disable-next-line rulesdir/no-restricted-imports-clone, prettier/prettier
import {Glyph} from 'flipper';
import {
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  TableOutlined,
  BellOutlined,
} from '@ant-design/icons';
import {usePlugin, useValue, Layout, theme} from 'flipper-plugin';
import {FrameworkEventMetadata, FrameworkEventType} from '../../ClientTypes';
import {
  buildTreeSelectData,
  FrameworkEventsTreeSelect,
} from '../shared/FrameworkEventsTreeSelect';
import {createDropDownItem} from '../shared/createDropDownItem';
import {TreeNodeRow} from './Tree';

type FrameworkEventsDropDownItems = 'OpenTable' | 'Monitoring';
const frameworkEventsDropDownItems = [
  {
    key: 'group',
    type: 'group',
    label: 'Framework Events',
    children: [
      createDropDownItem<FrameworkEventsDropDownItems>(
        'OpenTable',
        'Open global table',
        <TableOutlined />,
      ),
      createDropDownItem<FrameworkEventsDropDownItems>(
        'Monitoring',
        'Real time monitoring',
        <EyeOutlined />,
      ),
    ],
  },
];

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

  const frameworkEventMetadata = useValue(instance.frameworkEventMetadata);

  const currentTraversalMode = useValue(instance.uiState.traversalMode);
  const supportedTraversalModes = useValue(
    instance.uiState.supportedTraversalModes,
  );

  const isConnected = useValue(instance.uiState.isConnected);

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
      {supportedTraversalModes.length > 1 &&
        supportedTraversalModes.includes('accessibility-hierarchy') && (
          <Tooltip title="Accessibility mode">
            <Button
              disabled={!isConnected}
              shape="circle"
              onClick={() => {
                if (currentTraversalMode === 'accessibility-hierarchy') {
                  instance.uiActions.onSetTraversalMode('view-hierarchy');
                } else {
                  instance.uiActions.onSetTraversalMode(
                    'accessibility-hierarchy',
                  );
                }
              }}>
              <Glyph
                name={'accessibility'}
                size={16}
                color={
                  currentTraversalMode === 'accessibility-hierarchy'
                    ? theme.primaryColor
                    : theme.textColorPrimary
                }
              />
            </Button>
          </Tooltip>
        )}
      {frameworkEventMonitoring.size > 0 && (
        <>
          <Dropdown
            menu={{
              selectable: false,
              items: frameworkEventsDropDownItems,
              onClick: (event) => {
                const key: FrameworkEventType = event.key;
                if (key === 'Monitoring') {
                  setShowFrameworkEventsModal(true);
                } else if (key === 'OpenTable') {
                  instance.uiActions.onSetViewMode({
                    mode: 'frameworkEventsTable',
                    isTree: false,
                    nodeId: null,
                  });
                }
              },
            }}>
            <Badge
              size="small"
              count={
                [...frameworkEventMonitoring.values()].filter(
                  (val) => val === true,
                ).length
              }>
              <Button
                type="default"
                shape="circle"
                icon={<BellOutlined />}></Button>
            </Badge>
          </Dropdown>

          <FrameworkEventsMonitoringModal
            metadata={frameworkEventMetadata}
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
  metadata,
}: {
  metadata: Map<FrameworkEventType, FrameworkEventMetadata>;
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
    metadata,
  );

  return (
    <Modal
      title={
        <Typography.Title level={2}>
          Real time event monitoring
        </Typography.Title>
      }
      open={visible}
      footer={null}
      onCancel={onCancel}>
      <Space direction="vertical" size="large">
        <Layout.Container gap="large">
          <FrameworkEventsTreeSelect
            placeholder="Select event types to real time monitor"
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

          <Divider style={{margin: 0}} />

          <Layout.Container gap="small">
            <Typography.Text style={{fontStyle: 'italic'}}>
              When monitoring an event type, any components that fired this
              event will highlight in the visualizer briefly. Additionally a
              counter will show the total number of monitored events per
              component in the tree view like so
            </Typography.Text>

            <div style={{position: 'relative', height: 26, marginTop: 16}}>
              <TreeNodeRow
                transform=""
                onCollapseNode={() => {}}
                onExpandNode={() => {}}
                onHoverNode={() => {}}
                onSelectNode={() => {}}
                highlightedNodes={new Map()}
                isContextMenuOpen={false}
                innerRef={React.createRef<HTMLLIElement>()}
                isUsingKBToScroll={React.createRef<number>()}
                treeNode={{
                  attributes: {},
                  bounds: {x: 0, y: 0, width: 10, height: 10},
                  children: [],
                  depth: 0,
                  frameworkEvents: 4,
                  id: '12',
                  idx: 0,
                  indentGuides: [],
                  inlineAttributes: {},
                  isExpanded: true,
                  name: 'Example mountable component',
                  qualifiedName: '',
                  tags: ['Litho'],
                }}
              />
            </div>
          </Layout.Container>
        </Layout.Container>
      </Space>
    </Modal>
  );
}

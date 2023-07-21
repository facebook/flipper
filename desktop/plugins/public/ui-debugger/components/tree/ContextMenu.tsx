/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */
import {FrameworkEvent, Id, ClientNode} from '../../ClientTypes';
import {ViewMode} from '../../DesktopTypes';
import React, {ReactNode} from 'react';
import {DataSource, getFlipperLib} from 'flipper-plugin';
import {Dropdown, Menu} from 'antd';
import {UIDebuggerMenuItem} from '../util/UIDebuggerMenuItem';
import {tracker} from '../../utils/tracker';
import {
  BigGrepContextMenuItems,
  IDEContextMenuItems,
} from '../fb-stubs/IDEContextMenu';
import {
  CopyOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  SnippetsOutlined,
  TableOutlined,
} from '@ant-design/icons';

export const ContextMenu: React.FC<{
  frameworkEvents: DataSource<FrameworkEvent>;
  nodes: Map<Id, ClientNode>;
  hoveredNodeId?: Id;
  focusedNodeId?: Id;
  onFocusNode: (id?: Id) => void;
  onContextMenuOpen: (open: boolean) => void;
  onSetViewMode: (viewMode: ViewMode) => void;
}> = ({
  nodes,
  frameworkEvents,
  hoveredNodeId,
  children,
  focusedNodeId,
  onFocusNode,
  onContextMenuOpen,
  onSetViewMode,
}) => {
  const copyItems: ReactNode[] = [];
  const hoveredNode = nodes.get(hoveredNodeId ?? Number.MAX_SAFE_INTEGER);

  if (hoveredNode) {
    copyItems.push(
      <UIDebuggerMenuItem
        key="Copy Element name"
        text="Copy Element name"
        icon={<CopyOutlined />}
        onClick={() => {
          tracker.track('context-menu-name-copied', {name: hoveredNode.name});
          getFlipperLib().writeTextToClipboard(hoveredNode.name);
        }}
      />,
    );

    copyItems.push(
      Object.entries(hoveredNode.inlineAttributes).map(([key, value]) => (
        <UIDebuggerMenuItem
          key={key}
          text={`Copy ${key}`}
          icon={<SnippetsOutlined />}
          onClick={() => {
            tracker.track('context-menu-copied', {
              name: hoveredNode.name,
              key,
              value,
            });
            getFlipperLib().writeTextToClipboard(value);
          }}
        />
      )),
    );

    copyItems.push(
      <BigGrepContextMenuItems key="big-grep" node={hoveredNode} />,
    );
  }
  const focus = hoveredNode != null &&
    focusedNodeId !== hoveredNodeId &&
    hoveredNode.bounds.height !== 0 &&
    hoveredNode.bounds.width !== 0 && (
      <UIDebuggerMenuItem
        key="focus"
        text={`Focus element`}
        icon={<FullscreenExitOutlined />}
        onClick={() => {
          onFocusNode(hoveredNodeId);
        }}
      />
    );

  const removeFocus = focusedNodeId && (
    <UIDebuggerMenuItem
      key="remove-focus"
      text="Remove focus"
      icon={<FullscreenOutlined />}
      onClick={() => {
        onFocusNode(undefined);
      }}
    />
  );

  const matchingFrameworkEvents =
    (hoveredNode &&
      frameworkEvents.getAllRecordsByIndex({nodeId: hoveredNode.id})) ??
    [];

  const frameworkEventsTable = matchingFrameworkEvents.length > 0 && (
    <UIDebuggerMenuItem
      text="Explore events"
      onClick={() => {
        onSetViewMode({
          mode: 'frameworkEventsTable',
          treeRootId: hoveredNode?.id ?? '',
        });
      }}
      icon={<TableOutlined />}
    />
  );

  return (
    <Dropdown
      onVisibleChange={(visible) => {
        onContextMenuOpen(visible);
      }}
      overlay={() => (
        <Menu>
          {focus}
          {removeFocus}
          {frameworkEventsTable}
          {(focus || removeFocus || frameworkEventsTable) && (
            <Menu.Divider key="divider-focus" />
          )}
          {copyItems}

          {hoveredNode && <IDEContextMenuItems key="ide" node={hoveredNode} />}
        </Menu>
      )}
      trigger={['contextMenu']}>
      {children}
    </Dropdown>
  );
};

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  FrameworkEvent,
  Id,
  ClientNode,
  MetadataId,
  Metadata,
} from '../../ClientTypes';
import {OnSelectNode, ViewMode} from '../../DesktopTypes';
import React, {useState} from 'react';
import {DataSource, getFlipperLib} from 'flipper-plugin';
import {Dropdown, MenuProps, message} from 'antd';
import {tracker} from '../../utils/tracker';
import {
  bigGrepContextMenuItems,
  ideContextMenuItems,
} from '../fb-stubs/IDEContextMenu';
import {
  CopyOutlined,
  ExportOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  NodeExpandOutlined,
  SnippetsOutlined,
  TableOutlined,
} from '@ant-design/icons';
import {filterOutFalsy} from '../../utils/array';
import {exportNode} from '../../utils/dataTransform';

type MenuItems = MenuProps['items'];

export const ContextMenu: React.FC<{
  frameworkEvents: DataSource<FrameworkEvent>;
  nodes: Map<Id, ClientNode>;
  metadata: Map<MetadataId, Metadata>;
  hoveredNodeId?: Id;
  focusedNodeId?: Id;
  onFocusNode: (id?: Id) => void;
  onContextMenuOpen: (open: boolean) => void;
  onSetViewMode: (viewMode: ViewMode) => void;
  onExpandRecursively: (id: Id) => void;
  onCollapseRecursively: (id: Id) => void;
  onCollapseNonAncestors: (id: Id) => void;
  onSelectNode: OnSelectNode;
}> = ({
  nodes,
  frameworkEvents,
  hoveredNodeId,
  children,
  focusedNodeId,
  onFocusNode,
  onContextMenuOpen,
  onSetViewMode,
  onExpandRecursively,
  onCollapseRecursively,
  onCollapseNonAncestors,
  onSelectNode,
  metadata,
}) => {
  const [_, setIdeItemsRerender] = useState(0);
  const hoveredNode = nodes.get(hoveredNodeId ?? Number.MAX_SAFE_INTEGER);

  const focus = hoveredNode != null &&
    focusedNodeId !== hoveredNodeId &&
    hoveredNode.bounds.height !== 0 &&
    hoveredNode.bounds.width !== 0 && {
      key: 'focus',
      label: `Focus element`,
      icon: <FullscreenExitOutlined />,
      onClick: () => {
        onFocusNode(hoveredNodeId);
      },
    };

  const removeFocus = focusedNodeId && {
    key: 'remove-focus',
    label: 'Remove focus',
    icon: <FullscreenOutlined />,
    onClick: () => {
      onFocusNode(undefined);
    },
  };

  const matchingFrameworkEvents =
    (hoveredNode &&
      frameworkEvents.getAllRecordsByIndex({nodeId: hoveredNode.id})) ??
    [];

  const frameworkEventsTable = matchingFrameworkEvents.length > 0 &&
    hoveredNode && {
      key: 'events-table',
      label: 'Explore events',
      icon: <TableOutlined />,
      onClick: () => {
        onSetViewMode({
          mode: 'frameworkEventsTable',
          nodeId: hoveredNode.id,
          isTree: hoveredNode.tags.includes('TreeRoot'),
        });
      },
    };

  const focusItems = [focus, removeFocus, frameworkEventsTable];

  const items: MenuItems =
    hoveredNode == null
      ? []
      : filterOutFalsy([
          {
            key: 'expand-recursive',
            label: 'Expand recursively',
            icon: <MenuUnfoldOutlined />,
            onClick: () => {
              onExpandRecursively(hoveredNode.id);
              onSelectNode(hoveredNode.id, 'context-menu');
              tracker.track('context-menu-expand-recursive', {});
            },
          },
          {
            key: 'collapse-recursive',
            label: 'Collapse recurisvely',
            icon: <MenuFoldOutlined />,
            onClick: () => {
              onCollapseRecursively(hoveredNode.id);
              onSelectNode(hoveredNode.id, 'context-menu');
              tracker.track('context-menu-collapse-recursive', {});
            },
          },
          {
            key: 'collapse-non-ancestors',
            label: 'Collapse non ancestors',
            icon: <NodeExpandOutlined />,
            onClick: () => {
              onCollapseNonAncestors(hoveredNode.id);
              onSelectNode(hoveredNode.id, 'context-menu');
              tracker.track('context-menu-collapse-non-ancestors', {});
            },
          },
          {type: 'divider'},
          ...focusItems,
          focusItems.length > 0 && {type: 'divider'},
          {
            key: 'Copy Element name',
            label: 'Copy Element name',
            icon: <CopyOutlined />,
            onClick: () => {
              tracker.track('context-menu-name-copied', {
                name: hoveredNode.name,
              });
              getFlipperLib().writeTextToClipboard(hoveredNode.name);
            },
          },
          ...Object.entries(hoveredNode.inlineAttributes).map(
            ([key, value]) => ({
              key: key,
              label: `Copy ${key}`,
              icon: <SnippetsOutlined />,
              onClick: () => {
                tracker.track('context-menu-copied', {
                  name: hoveredNode.name,
                  key,
                  value,
                });
                getFlipperLib().writeTextToClipboard(value);
              },
            }),
          ),
          {type: 'divider'},
          {
            key: 'export-node',
            label: 'Export',
            icon: <ExportOutlined />,
            onClick: () => {
              getFlipperLib().writeTextToClipboard(
                exportNode(hoveredNode, metadata, nodes),
              );
              message.success('Exported');
            },
          },
          {
            key: 'export-node-recursive',
            label: 'Export with children',
            icon: <ExportOutlined />,
            onClick: () => {
              getFlipperLib().writeTextToClipboard(
                exportNode(hoveredNode, metadata, nodes, true),
              );
              message.success('Exported');
            },
          },
          {type: 'divider'},
          ...(bigGrepContextMenuItems(hoveredNode) || []),
          ...(ideContextMenuItems(hoveredNode, () =>
            setIdeItemsRerender((value) => value + 1),
          ) || []),
        ]);

  return (
    <Dropdown
      onOpenChange={(visible) => {
        onContextMenuOpen(visible);
      }}
      menu={{
        items,
        onClick: () => {
          onContextMenuOpen(false);
        },
      }}
      trigger={['contextMenu']}>
      {children}
    </Dropdown>
  );
};

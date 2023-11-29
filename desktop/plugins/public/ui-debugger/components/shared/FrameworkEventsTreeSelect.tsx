/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {ReactNode} from 'react';
import {InfoCircleOutlined} from '@ant-design/icons';
import {Tooltip, TreeSelect} from 'antd';
import {Layout, theme} from 'flipper-plugin';
import {FrameworkEventMetadata, FrameworkEventType} from '../../ClientTypes';

export function FrameworkEventsTreeSelect({
  treeData,
  onSetEventSelected,
  selected,
  placeholder,
  width,
}: {
  width?: number;
  placeholder: string;
  selected: string[];
  treeData: TreeSelectNode[];
  onSetEventSelected: (
    eventType: FrameworkEventType,
    selected: boolean,
  ) => void;
}) {
  return (
    <TreeSelect
      treeCheckable
      showSearch={false}
      showCheckedStrategy={TreeSelect.SHOW_PARENT}
      placeholder={placeholder}
      virtual={false} //for scrollbar
      style={{
        width: width ?? '100%',
      }}
      treeData={treeData}
      treeDefaultExpandAll
      value={selected}
      onSelect={(_: any, node: any) => {
        for (const leaf of getAllLeaves(node)) {
          onSetEventSelected(leaf, true);
        }
      }}
      onDeselect={(_: any, node: any) => {
        for (const leaf of getAllLeaves(node)) {
          onSetEventSelected(leaf, false);
        }
      }}
    />
  );
}

type TreeSelectNode = {
  title: ReactNode;
  titleValue: string;
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

export const frameworkEventSeparator = '.';
/**
 * transformed flat event type data structure into tree
 */
export function buildTreeSelectData(
  eventTypes: string[],
  metadata: Map<FrameworkEventType, FrameworkEventMetadata>,
): TreeSelectNode[] {
  const root: TreeSelectNode = buildTreeSelectNode('root', 'root', metadata);

  eventTypes.forEach((eventType) => {
    const eventSubtypes = eventType.split(frameworkEventSeparator);
    let currentNode = root;

    // Find the parent node for the current id
    for (let i = 0; i < eventSubtypes.length - 1; i++) {
      let foundChild = false;
      for (const child of currentNode.children) {
        if (child.titleValue === eventSubtypes[i]) {
          currentNode = child;
          foundChild = true;
          break;
        }
      }
      if (!foundChild) {
        const newNode: TreeSelectNode = buildTreeSelectNode(
          eventSubtypes[i],
          eventSubtypes.slice(0, i + 1).join(frameworkEventSeparator),
          metadata,
        );

        currentNode.children.push(newNode);
        currentNode = newNode;
      }
    }
    // Add the current id as a child of the parent node
    currentNode.children.push(
      buildTreeSelectNode(
        eventSubtypes[eventSubtypes.length - 1],
        eventSubtypes
          .slice(0, eventSubtypes.length)
          .join(frameworkEventSeparator),
        metadata,
      ),
    );
  });

  return root.children;
}

function buildTreeSelectNode(
  title: string,
  fullValue: string,
  metadata: Map<FrameworkEventType, FrameworkEventMetadata>,
): TreeSelectNode {
  const documentation = metadata.get(fullValue)?.documentation;
  return {
    title: (
      <Layout.Horizontal gap="small" center>
        {title}
        {documentation && (
          <Tooltip title={documentation}>
            <InfoCircleOutlined
              style={{
                color: theme.primaryColor,
                fontSize: theme.fontSize.large,
              }}
            />
          </Tooltip>
        )}
      </Layout.Horizontal>
    ),
    titleValue: title,
    key: fullValue,
    value: fullValue,
    children: [],
  };
}

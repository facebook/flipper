/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Id, plugin, UINode} from '../index';
import {usePlugin, useValue} from 'flipper-plugin';
import {Tree} from 'antd';
import type {DataNode} from 'antd/es/tree';
import {DownOutlined} from '@ant-design/icons';

function treeToAntTree(uiNode: UINode): DataNode {
  return {
    key: uiNode.id,
    title: uiNode.name,
    children: uiNode.children ? uiNode.children.map(treeToAntTree) : [],
  };
}

function treeToMap(uiNode: UINode): Map<Id, UINode> {
  const result = new Map<Id, UINode>();

  function treeToMapRec(node: UINode): void {
    result.set(node.id, node);
    for (const child of node.children) {
      treeToMapRec(child);
    }
  }

  treeToMapRec(uiNode);

  return result;
}

export function Component() {
  const instance = usePlugin(plugin);
  const rootId = useValue(instance.rootId);
  const tree = useValue(instance.tree);

  if (tree) {
    const nodeMap = treeToMap(tree);
    const antTree = treeToAntTree(tree);
    return (
      <Tree
        showIcon
        showLine
        onSelect={(selected) => {
          console.log(nodeMap.get(selected[0] as string));
        }}
        defaultExpandAll
        switcherIcon={<DownOutlined />}
        treeData={[antTree]}
      />
    );
  }

  return <div>{rootId}</div>;
}

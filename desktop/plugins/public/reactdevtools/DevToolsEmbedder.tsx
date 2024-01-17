/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useEffect} from 'react';

// TODO: build abstraction of this: T62306732
const TARGET_CONTAINER_ID = 'flipper-out-of-contents-container'; // should be a hook in the future

export function DevToolsEmbedder({
  offset,
  nodeId,
}: {
  offset: number;
  nodeId: string;
}) {
  useEffect(() => {
    attachDevTools(createDevToolsNode(nodeId), offset);
    return () => {
      detachDevTools(findDevToolsNode(nodeId));
    };
  }, [offset, nodeId]);

  return null;
}

function createDevToolsNode(nodeId: string): HTMLElement {
  const existing = findDevToolsNode(nodeId);
  if (existing) {
    return existing;
  }

  const wrapper = document.createElement('div');
  wrapper.id = nodeId;
  wrapper.style.height = '100%';
  wrapper.style.width = '100%';

  // TODO: Fix this the next time the file is edited.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  document.getElementById(TARGET_CONTAINER_ID)!.appendChild(wrapper);
  return wrapper;
}

function findDevToolsNode(nodeId: string): HTMLElement | null {
  return document.querySelector('#' + nodeId);
}

function attachDevTools(devToolsNode: HTMLElement, offset: number = 0) {
  devToolsNode.style.display = 'block';
  // TODO: Fix this the next time the file is edited.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const container = document.getElementById(TARGET_CONTAINER_ID)!;
  container.style.display = 'block';
  // TODO: Fix this the next time the file is edited.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  container.parentElement!.style.display = 'block';
  // TODO: Fix this the next time the file is edited.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  container.parentElement!.style.height = `calc(100% - ${offset}px)`;
  // TODO: Fix this the next time the file is edited.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  container.parentElement!.style.marginTop = '0px';
}

function detachDevTools(devToolsNode: HTMLElement | null) {
  // TODO: Fix this the next time the file is edited.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  document.getElementById(TARGET_CONTAINER_ID)!.style.display = 'none';
  // TODO: Fix this the next time the file is edited.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  document.getElementById(TARGET_CONTAINER_ID)!.parentElement!.style.display =
    'none';

  if (devToolsNode) {
    devToolsNode.style.display = 'none';
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createState, useValue} from '../state/atom';
import React, {ReactPortal} from 'react';
import {createPortal, unmountComponentAtNode} from 'react-dom';

/**
 * This utility creates a fresh react render hook, which is great to render elements imperatively, like opening dialogs.
 * Make sure to call `unmount` to cleanup after the rendering becomes irrelevant
 */
export function renderReactRoot(
  handler: (unmount: () => void) => React.ReactElement,
): () => void {
  // TODO: find a way to make this visible in unit tests as well
  const div = document.body.appendChild(document.createElement('div'));
  const unmount = () => {
    portals.update((draft) => {
      draft.delete(id);
    });
    unmountComponentAtNode(div);
    div.remove();
  };
  const id = ++portalId;
  const portal = createPortal(handler(unmount), div);
  portals.update((draft) => {
    draft.set(id, portal);
  });

  return unmount;
}

let portalId = 0;
const portals = createState(new Map<number, ReactPortal>());

/**
 * This is a dummy component, that just makes sure react roots are managed within a certain node in the main React tree, so that context etc is available.
 */
export function _PortalsManager() {
  const portalElements = useValue(portals);
  return <>{Array.from(portalElements).map(([_id, portal]) => portal)}</>;
}

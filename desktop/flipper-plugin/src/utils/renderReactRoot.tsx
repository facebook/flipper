/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {render, unmountComponentAtNode} from 'react-dom';

/**
 * This utility creates a fresh react render hook, which is great to render elements imperatively, like opening dialogs.
 * Make sure to call `unmount` to cleanup after the rendering becomes irrelevant
 */
export function renderReactRoot(
  handler: (unmount: () => void) => React.ReactElement,
): () => void {
  const div = document.body.appendChild(document.createElement('div'));
  const unmount = () => {
    unmountComponentAtNode(div);
    div.remove();
  };
  render(handler(unmount), div);
  return unmount;
}

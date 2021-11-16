/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useEffect, useState} from 'react';
import ReactDOM from 'react-dom';
import {toggleRightSidebarAvailable} from '../reducers/application';
import {useDispatch, useStore} from '../utils/useStore';
import {ContentContainer} from '../sandy-chrome/ContentContainer';
import {Layout, _Sidebar} from 'flipper-plugin';

export type DetailSidebarProps = {
  children: any;
  width?: number;
  minWidth?: number;
};

/* eslint-disable react-hooks/rules-of-hooks */
export function DetailSidebarImpl({
  children,
  width,
  minWidth,
}: DetailSidebarProps) {
  const [domNode, setDomNode] = useState(
    document.getElementById('detailsSidebar'),
  );

  if (typeof jest !== 'undefined') {
    // For unit tests, make sure to render elements inline
    return <div>{children}</div>;
  }

  const dispatch = useDispatch();
  const {rightSidebarAvailable, rightSidebarVisible} = useStore((state) => {
    const {rightSidebarAvailable, rightSidebarVisible} = state.application;
    return {rightSidebarAvailable, rightSidebarVisible};
  });

  useEffect(
    function updateSidebarAvailablility() {
      const available = Boolean(children);
      if (available !== rightSidebarAvailable) {
        dispatch(toggleRightSidebarAvailable(available));
      }
    },
    [children, rightSidebarAvailable, dispatch],
  );

  // If the plugin container is mounting and rendering a sidbar immediately, the domNode might not yet be available
  useEffect(() => {
    if (!domNode) {
      const newDomNode = document.getElementById('detailsSidebar');
      if (!newDomNode) {
        // if after layouting domNode is still not available, something is wrong...
        console.error('Failed to obtain detailsSidebar node');
      } else {
        setDomNode(newDomNode);
      }
    }
  }, [domNode]);

  return (
    (children &&
      rightSidebarVisible &&
      domNode &&
      ReactDOM.createPortal(
        <_Sidebar
          minWidth={minWidth}
          width={width || 300}
          position="right"
          gutter>
          <ContentContainer>
            <Layout.ScrollContainer vertical>{children}</Layout.ScrollContainer>
          </ContentContainer>
        </_Sidebar>,
        domNode,
      )) ||
    null
  );
}

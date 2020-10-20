/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useEffect, useMemo, useContext} from 'react';
import ReactDOM from 'react-dom';
import {ReactReduxContext} from 'react-redux';
import Sidebar from '../ui/components/Sidebar';
import {toggleRightSidebarAvailable} from '../reducers/application';
import {useDispatch, useStore} from '../utils/useStore';
import {useIsSandy} from '../sandy-chrome/SandyContext';
import {ContentContainer} from '../sandy-chrome/ContentContainer';

type OwnProps = {
  children: any;
  width?: number;
  minWidth?: number;
};

/* eslint-disable react-hooks/rules-of-hooks */
export default function DetailSidebar({children, width, minWidth}: OwnProps) {
  const reduxContext = useContext(ReactReduxContext);
  const domNode = useMemo(() => document.getElementById('detailsSidebar'), []);

  if (!reduxContext || !domNode) {
    // For unit tests, make sure to render elements inline
    return <div id="detailsSidebar">{children}</div>;
  }

  const isSandy = useIsSandy();
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

  return (
    (children &&
      rightSidebarVisible &&
      domNode &&
      ReactDOM.createPortal(
        <Sidebar
          minWidth={minWidth}
          width={width || 300}
          position="right"
          gutter={isSandy}>
          {isSandy ? <ContentContainer>{children}</ContentContainer> : children}
        </Sidebar>,
        domNode,
      )) ||
    null
  );
}

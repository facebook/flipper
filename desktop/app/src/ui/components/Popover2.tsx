/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useEffect, ReactNode} from 'react';
import {useContext} from 'react';
import {PopoverContext} from './PopoverProvider';

/**
 * Popover element to be used as a stopgap until we adopt a
 * UI framework.
 * I don't recommend using this, as it will likely be removed in future.
 * Must be nested under a PopoverProvider at some level, usually it is at the top level app so you shouldn't need to add it.
 * @deprecated use Popover from Antd
 */
export default function Popover2(props: {
  id: string;
  targetRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const popoverManager = useContext(PopoverContext);

  useEffect(() => {
    if (props.targetRef.current) {
      popoverManager.open(props.id, props.targetRef, props.children);
      return () => {
        popoverManager.close(props.id);
      };
    }
  });

  return null;
}

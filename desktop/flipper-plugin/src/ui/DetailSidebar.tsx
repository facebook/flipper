/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {tryGetFlipperLibImplementation} from '../plugin/FlipperLib';
import {Layout} from './Layout';

export type DetailSidebarProps = {
  children: any;
  width?: number;
  minWidth?: number;
  onResize?: (width: number, height: number) => void;
};

/* eslint-disable react-hooks/rules-of-hooks */
export function DetailSidebar(props: DetailSidebarProps) {
  const lib = tryGetFlipperLibImplementation();
  if (lib?.DetailsSidebarImplementation) {
    return <lib.DetailsSidebarImplementation {...props} />;
  }
  return <Layout.Container>{props.children}</Layout.Container>;
}

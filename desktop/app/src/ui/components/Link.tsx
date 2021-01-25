/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useCallback} from 'react';
import {shell} from 'electron';
import React from 'react';
import {Typography} from 'antd';

const AntOriginalLink = Typography.Link;

export default function Link(props: {
  href: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: ((event: React.MouseEvent<any>) => void) | undefined;
}) {
  const onClick = useCallback(
    (e: React.MouseEvent<any>) => {
      shell.openExternal(props.href);
      e.preventDefault();
      e.stopPropagation();
    },
    [props.href],
  );

  return <AntOriginalLink {...props} onClick={props.onClick ?? onClick} />;
}

// XXX. For consistent usage, we monkey patch AntDesign's Link component,
// as we never want to open links internally, which gives a really bad experience
// @ts-ignore
Typography.Link = Link;

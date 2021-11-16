/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';
import React, {createContext} from 'react';
import {Space} from 'antd';

const ButtonGroupContainer = styled.div({
  display: 'inline-flex',
  marginLeft: 10,
  '&:first-child': {
    marginLeft: 0,
  },
});
ButtonGroupContainer.displayName = 'ButtonGroup:ButtonGroupContainer';

export const ButtonGroupContext = createContext(false);

/**
 * Group a series of buttons together.
 *
 * ```jsx
 *   <ButtonGroup>
 *     <Button>One</Button>
 *     <Button>Two</Button>
 *     <Button>Three</Button>
 *   </ButtonGroup>
 * ```
 * @deprecated use Layout.Horizontal with flags: gap pad wrap
 */
export default function ButtonGroup({children}: {children: React.ReactNode}) {
  return (
    <ButtonGroupContext.Provider value>
      <Space>{children}</Space>
    </ButtonGroupContext.Provider>
  );
}

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
import {useIsSandy} from '../../sandy-chrome/SandyContext';
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
 */
export default function ButtonGroup({children}: {children: React.ReactNode}) {
  const isSandy = useIsSandy(); // according to Ant design guides buttons should only be grouped if they are radios
  return isSandy ? (
    <ButtonGroupContext.Provider value={true}>
      <Space>{children}</Space>
    </ButtonGroupContext.Provider>
  ) : (
    <ButtonGroupContext.Provider value={true}>
      <ButtonGroupContainer>{children}</ButtonGroupContainer>
    </ButtonGroupContext.Provider>
  );
}

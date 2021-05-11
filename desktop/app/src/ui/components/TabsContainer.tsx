/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import styled from '@emotion/styled';

const Container = styled.div({
  backgroundColor: '#E3E3E3',
  borderRadius: 4,
  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
  padding: 10,
  paddingTop: 0,
  marginTop: 11,
  marginBottom: 10,
});
Container.displayName = 'TabsContainer:Container';

export const TabsContext = React.createContext(true);

export default function TabsContainer(props: {children: any}) {
  return (
    <Container>
      <TabsContext.Provider value>{props.children}</TabsContext.Provider>
    </Container>
  );
}

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useState} from 'react';
import {FlexColumn, Button, styled, Tab, Tabs, TabsContainer} from 'flipper';
import PluginDebugger from './PluginDebugger';
import PluginInstaller from './PluginInstaller';

const Container = styled(FlexColumn)({
  padding: 15,
  width: 700,
});

const Row = styled(FlexColumn)({
  alignItems: 'flex-end',
});

type Tabs = 'Plugin Status' | 'Install Plugins';

export default function (props: {onHide: () => any}) {
  const [tab, setTab] = useState<Tabs>('Plugin Status');
  return (
    <Container>
      <TabsContainer>
        <Tabs
          active={tab}
          onActive={setTab as (s: string | null | undefined) => void}>
          <Tab label="Plugin Status" />
          <Tab label="Install Plugins" />
        </Tabs>
        {tab === 'Plugin Status' && <PluginDebugger />}
        {tab === 'Install Plugins' && <PluginInstaller />}
      </TabsContainer>
      <Row>
        <Button compact padded onClick={props.onHide}>
          Close
        </Button>
      </Row>
    </Container>
  );
}

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {useSelector} from 'react-redux';
import {getActivePlugin} from '../../selectors/connections';
import {ActivePluginListItem} from '../../utils/pluginUtils';
import {Layout} from '../../ui';
import {CenteredContainer} from '../../sandy-chrome/CenteredContainer';
import {Typography} from 'antd';
import {PluginActions} from '../PluginActions';
import {CoffeeOutlined} from '@ant-design/icons';

const {Text, Title} = Typography;

export function PluginInfo() {
  const activePlugin = useSelector(getActivePlugin);
  if (activePlugin) {
    return <PluginMarketplace activePlugin={activePlugin} />;
  } else {
    return null;
  }
}

function PluginMarketplace({
  activePlugin,
}: {
  activePlugin: ActivePluginListItem;
}) {
  return (
    <CenteredContainer>
      <Layout.Container center gap style={{maxWidth: 350}}>
        <CoffeeOutlined style={{fontSize: '24px'}} />
        <Title level={4}>
          Plugin '{activePlugin.details.title}' is {activePlugin.status}
        </Title>
        {activePlugin.status === 'unavailable' ? (
          <Text style={{textAlign: 'center'}}>{activePlugin.reason}.</Text>
        ) : null}
        <Layout.Horizontal gap>
          <PluginActions activePlugin={activePlugin} type="link" />
        </Layout.Horizontal>
      </Layout.Container>
    </CenteredContainer>
  );
}

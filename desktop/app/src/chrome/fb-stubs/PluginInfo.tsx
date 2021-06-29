/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useCallback, useMemo} from 'react';
import {Label, ToggleButton, SmallText, styled, Layout} from '../../ui';
import {useDispatch, useStore} from '../../utils/useStore';
import {switchPlugin} from '../../reducers/pluginManager';
import {isPluginEnabled} from '../../reducers/connections';
import {theme} from 'flipper-plugin';
import {PluginDefinition} from '../../plugin';
import {useSelector} from 'react-redux';
import {getActiveClient} from '../../selectors/connections';

const Waiting = styled(Layout.Container)({
  width: '100%',
  height: '100%',
  flexGrow: 1,
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
});

export default function PluginInfo() {
  const pluginId = useStore((state) => state.connections.selectedPlugin);
  const enabledPlugins = useStore((state) => state.connections.enabledPlugins);
  const enabledDevicePlugins = useStore(
    (state) => state.connections.enabledDevicePlugins,
  );
  const activeClient = useSelector(getActiveClient);
  const clientPlugins = useStore((state) => state.plugins.clientPlugins);
  const devicePlugins = useStore((state) => state.plugins.devicePlugins);
  const selectedClientId = activeClient?.id ?? null;
  const selectedApp = activeClient?.query.app ?? null;
  const disabledPlugin = useMemo(
    () =>
      pluginId &&
      !isPluginEnabled(
        enabledPlugins,
        enabledDevicePlugins,
        selectedClientId,
        pluginId,
      )
        ? clientPlugins.get(pluginId) ?? devicePlugins.get(pluginId)
        : undefined,
    [
      pluginId,
      enabledPlugins,
      enabledDevicePlugins,
      selectedClientId,
      clientPlugins,
      devicePlugins,
    ],
  );
  return disabledPlugin ? (
    <PluginEnabler plugin={disabledPlugin} selectedApp={selectedApp} />
  ) : null;
}

function PluginEnabler({
  plugin,
  selectedApp,
}: {
  plugin: PluginDefinition;
  selectedApp: string | null;
}) {
  const dispatch = useDispatch();
  const enablePlugin = useCallback(() => {
    dispatch(switchPlugin({plugin, selectedApp: selectedApp ?? undefined}));
  }, [dispatch, plugin, selectedApp]);
  return (
    <Layout.Container grow>
      <Waiting>
        <Layout.Container>
          <Layout.Horizontal>
            <Label
              style={{
                fontSize: '16px',
                color: theme.textColorSecondary,
                textTransform: 'uppercase',
              }}>
              {plugin.title}
            </Label>
          </Layout.Horizontal>
        </Layout.Container>
        <Layout.Container>
          <ToggleButton toggled={false} onClick={enablePlugin} large />
        </Layout.Container>
        <Layout.Container>
          <SmallText>Click to enable this plugin</SmallText>
        </Layout.Container>
      </Waiting>
    </Layout.Container>
  );
}

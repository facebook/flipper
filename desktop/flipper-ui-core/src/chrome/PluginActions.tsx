/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  DownloadOutlined,
  LoadingOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {Alert, Button} from 'antd';
import {
  BundledPluginDetails,
  DownloadablePluginDetails,
} from 'flipper-plugin-lib';
import React, {useMemo} from 'react';
import {useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {PluginDefinition} from '../plugin';
import {startPluginDownload} from '../reducers/pluginDownloads';
import {loadPlugin, switchPlugin} from '../reducers/pluginManager';
import {
  getActiveClient,
  getPluginDownloadStatusMap,
} from '../selectors/connections';
import {Layout} from '../ui';
import {ActivePluginListItem} from '../utils/pluginUtils';

export function PluginActions({
  activePlugin,
  type,
}: {
  activePlugin: ActivePluginListItem;
  type: 'link' | 'primary';
}) {
  switch (activePlugin.status) {
    case 'disabled': {
      return <EnableButton plugin={activePlugin.definition} type={type} />;
    }
    case 'uninstalled': {
      return <InstallButton plugin={activePlugin.details} type={type} />;
    }
    case 'unavailable': {
      return type === 'primary' ? (
        <UnavailabilityAlert reason={activePlugin.reason} />
      ) : null;
    }
    default:
      return null;
  }
}

function EnableButton({
  plugin,
  type,
}: {
  plugin: PluginDefinition;
  type: 'link' | 'primary';
}) {
  const dispatch = useDispatch();
  const client = useSelector(getActiveClient);
  const enableOrDisablePlugin = useCallback(() => {
    dispatch(switchPlugin({plugin, selectedApp: client?.query?.app}));
  }, [dispatch, plugin, client]);
  return (
    <Button
      type={type}
      icon={<PlusOutlined />}
      onClick={enableOrDisablePlugin}
      style={{flexGrow: type == 'primary' ? 1 : 0}}>
      Enable Plugin
    </Button>
  );
}

function UnavailabilityAlert({reason}: {reason: string}) {
  return (
    <Layout.Container center>
      <Alert message={reason} type="warning" />
    </Layout.Container>
  );
}

function InstallButton({
  plugin,
  type = 'primary',
}: {
  plugin: DownloadablePluginDetails | BundledPluginDetails;
  type: 'link' | 'primary';
}) {
  const dispatch = useDispatch();
  const installPlugin = useCallback(() => {
    if (plugin.isBundled) {
      dispatch(loadPlugin({plugin, enable: true, notifyIfFailed: true}));
    } else {
      dispatch(startPluginDownload({plugin, startedByUser: true}));
    }
  }, [plugin, dispatch]);
  const downloads = useSelector(getPluginDownloadStatusMap);
  const downloadStatus = useMemo(
    () => downloads.get(plugin.id),
    [downloads, plugin],
  );
  return (
    <Button
      type={type}
      disabled={!!downloadStatus}
      icon={
        downloadStatus ? (
          <LoadingOutlined size={16} />
        ) : (
          <DownloadOutlined size={16} />
        )
      }
      onClick={installPlugin}
      style={{
        flexGrow: type === 'primary' ? 1 : 0,
      }}>
      Install Plugin
    </Button>
  );
}

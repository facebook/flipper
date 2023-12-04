/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button, notification} from 'antd';
import * as React from 'react';
import {getFlipperLib} from '../plugin/FlipperLib';
import {PluginClient} from '../plugin/Plugin';

export type SuggestNewPluginProps = {
  newPluginGK?: string;
  newPluginId: string;
  newPluginName: string;
  legacyPluginId: string;
  legacyPluginName: string;
  client: PluginClient;
};

export const suggestNewPlugin = ({
  newPluginGK,
  newPluginId,
  newPluginName,
  legacyPluginId,
  legacyPluginName,
  client,
}: SuggestNewPluginProps) => {
  if (newPluginGK && !getFlipperLib().GK(newPluginGK)) {
    return;
  }

  const lastShownTimestampKey = `${legacyPluginId}-${newPluginId}-BannerLastShownTimestamp`;
  let lastShownTimestampFromStorage = undefined;
  try {
    lastShownTimestampFromStorage = window.localStorage.getItem(
      lastShownTimestampKey,
    );
  } catch (e) {}

  if (lastShownTimestampFromStorage) {
    const WithinOneDay = (timestamp: number) => {
      const Day = 1 * 24 * 60 * 60 * 1000;
      const DayAgo = Date.now() - Day;

      return timestamp > DayAgo;
    };
    const lastShownTimestamp = Number(lastShownTimestampFromStorage);
    if (WithinOneDay(lastShownTimestamp)) {
      // The banner was shown less than 24-hours ago, don't show it again.
      return;
    }
  }

  const lastShownTimestamp = Date.now();
  try {
    window.localStorage.setItem(
      lastShownTimestampKey,
      String(lastShownTimestamp),
    );
  } catch (e) {}

  const key = `open-${newPluginId}-${lastShownTimestamp}`;
  const btn = (
    <Button
      type="primary"
      size="small"
      onClick={() => {
        notification.close(key);
        client.selectPlugin(newPluginId, undefined);
      }}>
      Try it now!
    </Button>
  );

  notification.open({
    message: `${legacyPluginName} plugin is being deprecated.`,
    description: `The new replacement plugin, ${newPluginName}, is available for use now.
      Find it on the left panel`,
    duration: 30,
    type: 'warning',
    btn,
    key,
  });
};

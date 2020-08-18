/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {connect} from 'react-redux';
import {colors, GK} from 'flipper';

import config from '../../fb-stubs/config';
import {PluginNotification} from '../../reducers/notifications';
import {
  ActiveSheet,
  ACTIVE_SHEET_PLUGINS,
  ACTIVE_SHEET_CONSOLE_LOGS,
} from '../../reducers/application';
import {State as Store} from '../../reducers';
import NotificationScreen from '../NotificationScreen';
import {StaticView, setStaticView} from '../../reducers/connections';
import {setActiveSheet} from '../../reducers/application';
import UserAccount from '../UserAccount';
import SupportRequestFormV2 from '../../fb-stubs/SupportRequestFormV2';
import WatchTools from '../../fb-stubs/WatchTools';
import {
  isStaticViewActive,
  PluginIcon,
  PluginName,
  ListItem,
} from './sidebarUtils';
import {Group} from '../../reducers/supportForm';
import {getInstance} from '../../fb-stubs/Logger';
import {ConsoleLogs} from '../ConsoleLogs';

type OwnProps = {};

type StateFromProps = {
  staticView: StaticView;
  selectedGroup: Group;
};

type DispatchFromProps = {
  setActiveSheet: (activeSheet: ActiveSheet) => void;
  setStaticView: (payload: StaticView) => void;
};

type Props = OwnProps & StateFromProps & DispatchFromProps;

function MainSidebarUtilsSection({
  staticView,
  selectedGroup,
  setActiveSheet,
  setStaticView,
}: Props) {
  const showWatchDebugRoot = GK.get('watch_team_flipper_clientless_access');

  return (
    <div style={{flexShrink: 0, borderTop: `1px solid ${colors.blackAlpha10}`}}>
      {showWatchDebugRoot &&
        (function () {
          const active = isStaticViewActive(staticView, WatchTools);
          return (
            <ListItem
              active={active}
              style={{
                borderTop: `1px solid ${colors.blackAlpha10}`,
              }}
              onClick={() => setStaticView(WatchTools)}>
              <PluginIcon
                color={colors.light50}
                name={'watch-tv'}
                isActive={active}
              />
              <PluginName isActive={active}>Watch</PluginName>
            </ListItem>
          );
        })()}
      <RenderNotificationsEntry />
      {(function () {
        const active = isStaticViewActive(staticView, SupportRequestFormV2);
        return (
          <ListItem
            active={active}
            onClick={() => {
              getInstance().track('usage', 'support-form-source', {
                source: 'sidebar',
                group: selectedGroup.name,
              });
              setStaticView(SupportRequestFormV2);
            }}>
            <PluginIcon
              color={colors.light50}
              name={'app-dailies'}
              isActive={active}
            />
            <PluginName isActive={active}>Support Requests</PluginName>
          </ListItem>
        );
      })()}
      <ListItem onClick={() => setActiveSheet(ACTIVE_SHEET_PLUGINS)}>
        <PluginIcon
          name="question-circle"
          color={colors.light50}
          isActive={false}
        />
        Manage Plugins
      </ListItem>
      <ListItem
        onClick={() => setStaticView(ConsoleLogs)}
        active={isStaticViewActive(staticView, ConsoleLogs)}>
        <PluginIcon
          name="caution-octagon"
          color={colors.light50}
          isActive={isStaticViewActive(staticView, ConsoleLogs)}
        />
        Debug Logs
      </ListItem>
      {config.showLogin && <UserAccount />}
    </div>
  );
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({connections: {staticView}, supportForm: {supportFormV2}}) => ({
    staticView,
    selectedGroup: supportFormV2.selectedGroup,
  }),
  {
    setStaticView,
    setActiveSheet,
  },
)(MainSidebarUtilsSection);

type RenderNotificationsEntryProps = {
  numNotifications: number;
  staticView: StaticView;
};

type RenderNotificationsEntryDispatchFromProps = {
  setStaticView: (payload: StaticView) => void;
};

type RenderEntryProps = RenderNotificationsEntryProps &
  RenderNotificationsEntryDispatchFromProps;

const RenderNotificationsEntry = connect<
  RenderNotificationsEntryProps,
  RenderNotificationsEntryDispatchFromProps,
  {},
  Store
>(
  ({
    connections: {staticView},
    notifications: {activeNotifications, blacklistedPlugins},
  }) => ({
    numNotifications: (() => {
      const blacklist = new Set(blacklistedPlugins);
      return activeNotifications.filter(
        (n: PluginNotification) => !blacklist.has(n.pluginId),
      ).length;
    })(),
    staticView,
  }),
  {
    setStaticView,
  },
)(({staticView, setStaticView, numNotifications}: RenderEntryProps) => {
  if (GK.get('flipper_disable_notifications')) {
    return null;
  }

  const active = isStaticViewActive(staticView, NotificationScreen);
  return (
    <ListItem active={active} onClick={() => setStaticView(NotificationScreen)}>
      <PluginIcon
        color={colors.light50}
        name={numNotifications > 0 ? 'bell' : 'bell-null'}
        isActive={active}
      />
      <PluginName count={numNotifications} isActive={active}>
        Notifications
      </PluginName>
    </ListItem>
  );
});

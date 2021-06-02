/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useCallback} from 'react';
import ShareSheetExportUrl from './ShareSheetExportUrl';
import SignInSheet from './fb-stubs/SignInSheet';
import ExportDataPluginSheet from './ExportDataPluginSheet';
import ShareSheetExportFile from './ShareSheetExportFile';
import JSEmulatorLauncherSheet from './JSEmulatorLauncherSheet';
import Sheet from './Sheet';
import {
  ACTIVE_SHEET_PLUGINS,
  ACTIVE_SHEET_SHARE_DATA,
  ACTIVE_SHEET_SIGN_IN,
  ACTIVE_SHEET_SETTINGS,
  ACTIVE_SHEET_DOCTOR,
  ACTIVE_SHEET_SHARE_DATA_IN_FILE,
  ACTIVE_SHEET_SELECT_PLUGINS_TO_EXPORT,
  ACTIVE_SHEET_PLUGIN_SHEET,
  ACTIVE_SHEET_JS_EMULATOR_LAUNCHER,
  ACTIVE_SHEET_CHANGELOG,
  ACTIVE_SHEET_CHANGELOG_RECENT_ONLY,
} from '../reducers/application';
import {Logger} from '../fb-interfaces/Logger';
import PluginManager from './plugin-manager/PluginManager';
import SettingsSheet from './SettingsSheet';
import DoctorSheet from './DoctorSheet';
import ChangelogSheet from './ChangelogSheet';
import {useStore} from '../utils/useStore';

export function SheetRenderer({logger}: {logger: Logger}) {
  const activeSheet = useStore((state) => state.application.activeSheet);
  // MWE: share being grabbed (and stored) here isn't ideal, clean up in the future?
  const share = useStore((state) => state.application.share);

  const renderSheet = useCallback(
    (onHide: () => any) => {
      switch (activeSheet) {
        case ACTIVE_SHEET_PLUGINS:
          return <PluginManager onHide={onHide} />;
        case ACTIVE_SHEET_SIGN_IN:
          return <SignInSheet onHide={onHide} />;
        case ACTIVE_SHEET_SETTINGS:
          return <SettingsSheet platform={process.platform} onHide={onHide} />;
        case ACTIVE_SHEET_DOCTOR:
          return <DoctorSheet onHide={onHide} />;
        case ACTIVE_SHEET_CHANGELOG:
          return <ChangelogSheet onHide={onHide} />;
        case ACTIVE_SHEET_CHANGELOG_RECENT_ONLY:
          return <ChangelogSheet onHide={onHide} recent />;
        case ACTIVE_SHEET_SELECT_PLUGINS_TO_EXPORT:
          return <ExportDataPluginSheet onHide={onHide} />;
        case ACTIVE_SHEET_SHARE_DATA:
          return (
            <ShareSheetExportUrl
              onHide={onHide}
              logger={logger}
              closeOnFinish={share != null && share.closeOnFinish}
            />
          );
        case ACTIVE_SHEET_SHARE_DATA_IN_FILE:
          return share && share.type === 'file' ? (
            <ShareSheetExportFile
              onHide={onHide}
              file={share.file}
              logger={logger}
            />
          ) : (
            (() => {
              console.error('No file provided when calling share sheet.');
              return null;
            })()
          );
        case ACTIVE_SHEET_PLUGIN_SHEET:
          // Currently unused.
          return null;
        case ACTIVE_SHEET_JS_EMULATOR_LAUNCHER:
          return <JSEmulatorLauncherSheet onHide={onHide} />;
        default:
          return null;
      }
    },
    [activeSheet, logger, share],
  );

  return <Sheet>{renderSheet}</Sheet>;
}

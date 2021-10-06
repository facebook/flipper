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
import ExportDataPluginSheet from './ExportDataPluginSheet';
import ShareSheetExportFile from './ShareSheetExportFile';
import Sheet from './Sheet';
import {
  ACTIVE_SHEET_SHARE_DATA,
  ACTIVE_SHEET_SHARE_DATA_IN_FILE,
  ACTIVE_SHEET_SELECT_PLUGINS_TO_EXPORT,
} from '../reducers/application';
import {Logger} from '../fb-interfaces/Logger';
import {useStore} from '../utils/useStore';

export function SheetRenderer({logger}: {logger: Logger}) {
  const activeSheet = useStore((state) => state.application.activeSheet);
  // MWE: share being grabbed (and stored) here isn't ideal, clean up in the future?
  const share = useStore((state) => state.application.share);

  const renderSheet = useCallback(
    (onHide: () => any) => {
      switch (activeSheet) {
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
        default:
          return null;
      }
    },
    [activeSheet, logger, share],
  );

  return <Sheet>{renderSheet}</Sheet>;
}

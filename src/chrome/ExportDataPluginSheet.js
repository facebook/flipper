/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Component, connect} from 'flipper';
import type {ShareType} from '../reducers/application.js';
import type {State as PluginState} from '../reducers/plugins.js';
import type {State as PluginStatesState} from '../reducers/pluginStates.js';
import type {ActiveSheet} from '../reducers/application.js';
import {selectedPlugins as actionForSelectedPlugins} from '../reducers/plugins.js';
import {getActivePersistentPlugins} from '../utils/pluginUtils';
import {
  ACTIVE_SHEET_SHARE_DATA,
  setActiveSheet as getActiveSheetAction,
  setExportDataToFileActiveSheet as getExportDataToFileActiveSheetAction,
} from '../reducers/application.js';
import SelectPluginSheet from './SelectPluginSheet';

type OwnProps = {|
  onHide: () => mixed,
|};

type Props = {|
  ...OwnProps,
  share: ShareType,
  plugins: PluginState,
  pluginStates: PluginStatesState,
  selectedPlugins: (payload: Array<string>) => void,
  setActiveSheet: (payload: ActiveSheet) => void,
  setExportDataToFileActiveSheet: (payload: string) => void,
|};

class ExportDataPluginSheet extends Component<Props, *> {
  render() {
    const {plugins, pluginStates, onHide} = this.props;
    return (
      <SelectPluginSheet
        onSelect={selectedArray => {
          this.props.selectedPlugins(selectedArray);
          const {share} = this.props;
          if (!share) {
            console.error(
              'applications.share is undefined, whereas it was expected to be defined',
            );
          } else {
            switch (share.type) {
              case 'link':
                this.props.setActiveSheet(ACTIVE_SHEET_SHARE_DATA);
                break;
              case 'file': {
                const file = share.file;
                if (file) {
                  this.props.setExportDataToFileActiveSheet(file);
                } else {
                  console.error('share.file is undefined');
                }
              }
            }
          }
        }}
        plugins={getActivePersistentPlugins(pluginStates, plugins).reduce(
          (acc, plugin) => {
            acc.set(
              plugin,
              plugins.selectedPlugins.length <= 0
                ? true
                : plugins.selectedPlugins.includes(plugin),
            );
            return acc;
          },
          new Map(),
        )}
        onHide={onHide}
      />
    );
  }
}

export default connect<Props, OwnProps, _, _, _, _>(
  ({application: {share}, plugins, pluginStates}) => ({
    share: share,
    plugins,
    pluginStates,
  }),
  dispatch => {
    return {
      selectedPlugins: (plugins: Array<string>) => {
        dispatch(actionForSelectedPlugins(plugins));
      },
      setActiveSheet: (payload: ActiveSheet) => {
        dispatch(getActiveSheetAction(payload));
      },
      setExportDataToFileActiveSheet: (payload: string) => {
        dispatch(getExportDataToFileActiveSheetAction(payload));
      },
    };
  },
)(ExportDataPluginSheet);

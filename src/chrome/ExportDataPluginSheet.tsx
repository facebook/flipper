/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {connect} from 'react-redux';
import React, {Component} from 'react';
import {ShareType} from '../reducers/application';
import {State as PluginState} from '../reducers/plugins';
import {State as PluginStatesState} from '../reducers/pluginStates';
import {State as Store} from '../reducers';
import {ActiveSheet} from '../reducers/application';
import {selectedPlugins as actionForSelectedPlugins} from '../reducers/plugins';
import {getActivePersistentPlugins} from '../utils/pluginUtils';
import {
  ACTIVE_SHEET_SHARE_DATA,
  setActiveSheet as getActiveSheetAction,
  setExportDataToFileActiveSheet as getExportDataToFileActiveSheetAction,
} from '../reducers/application';
import SelectPluginSheet from './SelectPluginSheet';
import {Dispatch, Action} from 'redux';

type OwnProps = {
  onHide: () => void;
};

type StateFromProps = {
  share: ShareType | null;
  plugins: PluginState;
  pluginStates: PluginStatesState;
};

type DispatchFromProps = {
  selectedPlugins: (payload: Array<string>) => void;
  setActiveSheet: (payload: ActiveSheet) => void;
  setExportDataToFileActiveSheet: (payload: {
    file: string;
    closeOnFinish: boolean;
  }) => void;
};

type Props = OwnProps & StateFromProps & DispatchFromProps;
class ExportDataPluginSheet extends Component<Props> {
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
                  this.props.setExportDataToFileActiveSheet({
                    file,
                    closeOnFinish: true,
                  });
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

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({application: {share}, plugins, pluginStates}) => ({
    share,
    plugins,
    pluginStates,
  }),
  (dispatch: Dispatch<Action<any>>) => ({
    selectedPlugins: (plugins: Array<string>) => {
      dispatch(actionForSelectedPlugins(plugins));
    },
    setActiveSheet: (payload: ActiveSheet) => {
      dispatch(getActiveSheetAction(payload));
    },
    setExportDataToFileActiveSheet: (payload: {
      file: string;
      closeOnFinish: boolean;
    }) => {
      dispatch(getExportDataToFileActiveSheetAction(payload));
    },
  }),
)(ExportDataPluginSheet);

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
import {State as PluginMessageQueueState} from '../reducers/pluginMessageQueue';
import {ActiveSheet} from '../reducers/application';
import {selectedPlugins as actionForSelectedPlugins} from '../reducers/plugins';
import {getActivePersistentPlugins} from '../utils/pluginUtils';
import {
  ACTIVE_SHEET_SHARE_DATA,
  setActiveSheet as getActiveSheetAction,
  setExportDataToFileActiveSheet as getExportDataToFileActiveSheetAction,
} from '../reducers/application';
import ListView from './ListView';
import {Dispatch, Action} from 'redux';
import {unsetShare} from '../reducers/application';
import {FlexColumn, styled} from 'flipper';
import Client from '../Client';

type OwnProps = {
  onHide: () => void;
};

type StateFromProps = {
  share: ShareType | null;
  plugins: PluginState;
  pluginStates: PluginStatesState;
  pluginMessageQueue: PluginMessageQueueState;
  selectedClient: Client | undefined;
};

type DispatchFromProps = {
  setSelectedPlugins: (payload: Array<string>) => void;
  setActiveSheet: (payload: ActiveSheet) => void;
  setExportDataToFileActiveSheet: (payload: {
    file: string;
    closeOnFinish: boolean;
  }) => void;
  unsetShare: () => void;
};

type Props = OwnProps & StateFromProps & DispatchFromProps;

const Container = styled(FlexColumn)({
  width: 700,
  maxHeight: 700,
  padding: 8,
});

type State = {
  availablePluginsToExport: Array<{id: string; label: string}>;
};

class ExportDataPluginSheet extends Component<Props, State> {
  state: State = {availablePluginsToExport: []};
  static getDerivedStateFromProps(props: Props, _state: State): State {
    const {plugins, pluginStates, pluginMessageQueue, selectedClient} = props;
    const availablePluginsToExport = getActivePersistentPlugins(
      pluginStates,
      pluginMessageQueue,
      plugins,
      selectedClient,
    );
    return {
      availablePluginsToExport,
    };
  }

  render() {
    const {onHide} = this.props;
    const onHideWithUnsettingShare = () => {
      this.props.unsetShare();
      onHide();
    };
    return (
      <Container>
        <ListView
          type="multiple"
          title="Select the plugins for which you want to export the data"
          onSubmit={() => {
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
          onChange={selectedArray => {
            this.props.setSelectedPlugins(selectedArray);
          }}
          elements={this.state.availablePluginsToExport}
          selectedElements={new Set(this.props.plugins.selectedPlugins)}
          onHide={onHideWithUnsettingShare}
        />
      </Container>
    );
  }
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({
    application: {share},
    plugins,
    pluginStates,
    pluginMessageQueue,
    connections: {selectedApp, clients},
  }) => {
    const selectedClient = clients.find(o => {
      return o.id === selectedApp;
    });
    return {
      share,
      plugins,
      pluginStates,
      pluginMessageQueue,
      selectedClient,
    };
  },
  (dispatch: Dispatch<Action<any>>) => ({
    setSelectedPlugins: (plugins: Array<string>) => {
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
    unsetShare: () => {
      dispatch(unsetShare());
    },
  }),
)(ExportDataPluginSheet);

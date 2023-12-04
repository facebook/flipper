/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {connect} from 'react-redux';
import React, {Component} from 'react';
import {State as Store} from '../reducers';
import ListView from './ListView';
import {FlexColumn, styled} from '../ui';
import {getExportablePlugins} from '../selectors/connections';

type OwnProps = {
  onHide: () => void;
  selectedPlugins: Array<string>;
  setSelectedPlugins: (plugins: string[]) => void;
};

type StateFromProps = {
  availablePluginsToExport: Array<{id: string; label: string}>;
};

type Props = OwnProps & StateFromProps;

const Container = styled(FlexColumn)({
  maxHeight: 700,
  padding: 8,
});

class ExportDataPluginSheet extends Component<Props, {}> {
  render() {
    return (
      <Container>
        <ListView
          type="multiple"
          title="Select the plugins for which you want to export the data"
          leftPadding={8}
          onChange={(selectedArray) => {
            this.props.setSelectedPlugins(selectedArray);
          }}
          elements={this.props.availablePluginsToExport}
          selectedElements={new Set(this.props.selectedPlugins)}
          onHide={() => {}}
        />
      </Container>
    );
  }
}

export default connect<StateFromProps, {}, OwnProps, Store>((state) => {
  const availablePluginsToExport = getExportablePlugins(state);
  return {
    availablePluginsToExport,
  };
})(ExportDataPluginSheet);

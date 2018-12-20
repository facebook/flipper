/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {FlipperDevicePlugin, FlipperPlugin} from '../plugin';
import type {PluginDefinition} from '../dispatcher/plugins';
import type Client from '../Client';

import {Component} from 'react';
import {connect} from 'react-redux';
import {FlexColumn, Button, Text, ManagedTable, styled, colors} from 'flipper';
import {remote} from 'electron';

const Container = styled(FlexColumn)({
  padding: 10,
  width: 700,
});

const InfoText = styled(Text)({
  lineHeight: '140%',
});

const Title = styled('div')({
  fontWeight: '500',
  marginBottom: 10,
  marginTop: 8,
});

const Ellipsis = styled(Text)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const Row = styled(FlexColumn)({
  alignItems: 'flex-end',
});

const TableContainer = styled('div')({
  borderRadius: 4,
  overflow: 'hidden',
  border: `1px solid ${colors.macOSTitleBarButtonBorder}`,
  marginTop: 10,
  marginBottom: 10,
  backgroundColor: colors.white,
  height: 400,
  display: 'flex',
});

const Lamp = styled('div')(props => ({
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: props.on ? colors.lime : colors.red,
  border: `1px solid ${colors.blackAlpha30}`,
  marginTop: 6,
  flexShrink: 0,
}));

type Props = {|
  devicePlugins: Array<FlipperDevicePlugin<>>,
  clientPlugins: Array<FlipperPlugin<>>,
  gatekeepedPlugins: Array<PluginDefinition>,
  disabledPlugins: Array<PluginDefinition>,
  failedPlugins: Array<[PluginDefinition, string]>,
  clients: Array<Client>,
  onHide: () => mixed,
|};

const COLUMNS = {
  lamp: {
    value: '',
  },
  name: {
    value: 'Name',
  },
  status: {
    value: 'Status',
  },
  gk: {
    value: 'GK',
  },
  clients: {
    value: 'Supported by',
  },
  source: {
    value: 'Source',
  },
};

const COLUMNS_SIZES = {
  lamp: 20,
  name: 'flex',
  status: 110,
  gk: 120,
  clients: 90,
  source: 140,
};

class PluginDebugger extends Component<Props> {
  buildRow(
    name: string,
    loaded: boolean,
    status: string,
    GKname: ?string,
    GKpassing: ?boolean,
    pluginPath: ?string,
  ) {
    return {
      key: name,
      columns: {
        lamp: {value: <Lamp on={loaded} />},
        name: {value: <Ellipsis>{name}</Ellipsis>},
        status: {
          value: status ? (
            <Ellipsis title={status} passing={false}>
              {status}
            </Ellipsis>
          ) : null,
        },
        gk: {
          value: GKname && (
            <Ellipsis code title={GKname}>
              {GKname}
            </Ellipsis>
          ),
        },
        clients: {
          value: this.getSupportedClients(name),
        },
        source: {
          value:
            pluginPath && pluginPath.startsWith(remote.app.getAppPath()) ? (
              <i>bundled</i>
            ) : (
              <Ellipsis code title={pluginPath}>
                {pluginPath}
              </Ellipsis>
            ),
        },
      },
    };
  }

  getSupportedClients(id: string): string {
    return this.props.clients
      .reduce((acc: Array<string>, cv: Client) => {
        if (cv.plugins.includes(id)) {
          acc.push(cv.query.app);
        }
        return acc;
      }, [])
      .join(', ');
  }

  getRows() {
    let rows = [];
    this.props.gatekeepedPlugins.forEach(plugin =>
      rows.push(
        this.buildRow(
          plugin.name,
          false,
          'GK disabled',
          plugin.gatekeeper,
          false,
          plugin.entry,
        ),
      ),
    );

    this.props.devicePlugins.forEach(plugin =>
      rows.push(
        this.buildRow(
          plugin.id,
          true,
          '',
          // $FlowFixMe: Flow doesn't know this is inherited from FlipperBasePlugin
          plugin.gatekeeper,
          true,
          // $FlowFixMe: Flow doesn't know this is inherited from FlipperBasePlugin
          plugin.entry,
        ),
      ),
    );

    this.props.clientPlugins.forEach(plugin =>
      rows.push(
        this.buildRow(
          plugin.id,
          true,
          '',
          // $FlowFixMe: Flow doesn't know this is inherited from FlipperBasePlugin
          plugin.gatekeeper,
          true,
          // $FlowFixMe: Flow doesn't know this is inherited from FlipperBasePlugin
          plugin.entry,
        ),
      ),
    );

    this.props.disabledPlugins.forEach(plugin =>
      rows.push(
        this.buildRow(plugin.name, false, 'disabled', null, null, plugin.entry),
      ),
    );

    this.props.failedPlugins.forEach(([plugin, status]) =>
      rows.push(
        this.buildRow(plugin.name, false, status, null, null, plugin.entry),
      ),
    );

    return rows.sort((a, b) => (a.key < b.key ? -1 : 1));
  }

  render() {
    return (
      <Container>
        <Title>Plugin Status</Title>
        <InfoText>
          The table lists all plugins known to Flipper. Some of them might be
          blocked by GKs, others may not show up, because none of the connected
          apps is supporting it.
        </InfoText>
        <TableContainer>
          <ManagedTable
            columns={COLUMNS}
            rows={this.getRows()}
            highlightableRows={false}
            columnSizes={COLUMNS_SIZES}
          />
        </TableContainer>
        <Row>
          <Button compact padded onClick={this.props.onHide}>
            Close
          </Button>
        </Row>
      </Container>
    );
  }
}

// $FlowFixMe
export default connect(
  ({
    plugins: {
      devicePlugins,
      clientPlugins,
      gatekeepedPlugins,
      disabledPlugins,
      failedPlugins,
    },
    connections: {selectedPlugin, clients},
  }) => ({
    devicePlugins: Array.from(devicePlugins.values()),
    clientPlugins: Array.from(clientPlugins.values()),
    gatekeepedPlugins,
    clients,
    disabledPlugins,
    failedPlugins,
  }),
)(PluginDebugger);

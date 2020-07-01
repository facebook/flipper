/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PluginDetails} from 'flipper-plugin-lib';
import Client from '../../Client';
import {TableBodyRow} from '../../ui/components/table/types';
import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import {Text, ManagedTable, styled, colors, Link, Bordered} from 'flipper';
import StatusIndicator from '../../ui/components/StatusIndicator';
import {State as Store} from '../../reducers';
import {DevicePluginDefinition, ClientPluginDefinition} from '../../plugin';

const InfoText = styled(Text)({
  lineHeight: '130%',
  marginBottom: 8,
});

const Ellipsis = styled(Text)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const TableContainer = styled(Bordered)({
  marginTop: 10,
  height: 400,
});

const Lamp = (props: {on: boolean}) => (
  <StatusIndicator statusColor={props.on ? colors.lime : colors.red} />
);

type StateFromProps = {
  gatekeepedPlugins: Array<PluginDetails>;
  disabledPlugins: Array<PluginDetails>;
  failedPlugins: Array<[PluginDetails, string]>;
  clients: Array<Client>;
  selectedDevice: string | null | undefined;
  devicePlugins: DevicePluginDefinition[];
  clientPlugins: ClientPluginDefinition[];
};

type DispatchFromProps = {};

type OwnProps = {};

const COLUMNS = {
  lamp: {
    value: '',
  },
  name: {
    value: 'Name',
  },
  version: {
    value: 'Version',
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
  version: 60,
  status: 110,
  gk: 120,
  clients: 90,
  source: 140,
};

type Props = OwnProps & StateFromProps & DispatchFromProps;
class PluginDebugger extends Component<Props> {
  buildRow(
    name: string,
    version: string,
    loaded: boolean,
    status: string,
    GKname: string | null | undefined,
    pluginPath: string,
  ): TableBodyRow {
    return {
      key: name.toLowerCase(),
      columns: {
        lamp: {value: <Lamp on={loaded} />},
        name: {value: <Ellipsis>{name}</Ellipsis>},
        version: {value: <Ellipsis>{version}</Ellipsis>},
        status: {
          value: status ? <Ellipsis title={status}>{status}</Ellipsis> : null,
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
          value: (
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

  getRows(): Array<TableBodyRow> {
    const rows: Array<TableBodyRow> = [];

    const externalPluginPath = (p: any) => (p.isDefault ? 'bundled' : p.entry);

    this.props.gatekeepedPlugins.forEach((plugin) =>
      rows.push(
        this.buildRow(
          plugin.name,
          plugin.version,
          false,
          'GK disabled',
          plugin.gatekeeper,
          externalPluginPath(plugin),
        ),
      ),
    );

    this.props.devicePlugins.forEach((plugin) =>
      rows.push(
        this.buildRow(
          plugin.id,
          plugin.version,
          true,
          '',
          plugin.gatekeeper,
          externalPluginPath(plugin),
        ),
      ),
    );

    this.props.clientPlugins.forEach((plugin) =>
      rows.push(
        this.buildRow(
          plugin.id,
          plugin.version,
          true,
          '',
          plugin.gatekeeper,
          externalPluginPath(plugin),
        ),
      ),
    );

    this.props.disabledPlugins.forEach((plugin) =>
      rows.push(
        this.buildRow(
          plugin.name,
          plugin.version,
          false,
          'disabled',
          null,
          externalPluginPath(plugin),
        ),
      ),
    );

    this.props.failedPlugins.forEach(([plugin, status]) =>
      rows.push(
        this.buildRow(
          plugin.name,
          plugin.version,
          false,
          status,
          null,
          externalPluginPath(plugin),
        ),
      ),
    );

    return rows.sort((a, b) => (a.key < b.key ? -1 : 1));
  }

  render() {
    let content = null;

    if (!this.props.selectedDevice) {
      content = (
        <InfoText>
          We can't find any device connected to your computer. Is an
          emulator/simulator currently running on your system, or is there a
          development device connected via USB? There are some devices/emulators
          known to have problems connecting to Flipper. Check out the{' '}
          <Link href="https://fbflipper.com/docs/troubleshooting#known-incompatibilities">
            known incompatibilities
          </Link>
          .
        </InfoText>
      );
    } else if (
      !this.props.clients.some(
        (client: Client) =>
          client.query.device_id === this.props.selectedDevice,
      )
    ) {
      // no clients for selected device
      content = (
        <Fragment>
          <InfoText>
            While Flipper was able to connect to your device, it wasn't able to
            connect to the app you are running on your device. For this reason,
            app-specific plugins will not show up.
          </InfoText>
          {this.props.clients.length > 0 && (
            // we have clients, but not for this device
            <InfoText>
              Make sure you selected the correct device from the dropdown button
              in the upper left corner. Only plugins for the selected device are
              shown in the sidebar.
            </InfoText>
          )}
          <InfoText>
            To debug why Flipper couldn't establish a connection to the app,
            check out our documentation about{' '}
            <Link href="https://fbflipper.com/docs/troubleshooting#connection-issues">
              connection issues
            </Link>
            .
          </InfoText>
        </Fragment>
      );
    } else {
      content = (
        <Fragment>
          <InfoText>
            The table lists all plugins known to Flipper. Some of them might be
            blocked by GKs, others may not show up, because none of the
            connected apps are supporting it.
          </InfoText>
          <TableContainer>
            <ManagedTable
              columns={COLUMNS}
              rows={this.getRows()}
              highlightableRows={false}
              columnSizes={COLUMNS_SIZES}
            />
          </TableContainer>
        </Fragment>
      );
    }
    return content;
  }
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({
    plugins: {
      devicePlugins,
      clientPlugins,
      gatekeepedPlugins,
      disabledPlugins,
      failedPlugins,
    },
    connections: {clients, selectedDevice},
  }) => ({
    devicePlugins: Array.from(devicePlugins.values()),
    clientPlugins: Array.from(clientPlugins.values()),
    gatekeepedPlugins,
    clients,
    disabledPlugins,
    failedPlugins,
    selectedDevice: selectedDevice && selectedDevice.serial,
  }),
)(PluginDebugger);

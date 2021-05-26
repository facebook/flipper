/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {notification, Typography} from 'antd';
import {DataSource} from '../data-source/index';
import React from 'react';
import {PluginClient} from '../plugin/Plugin';
import {usePlugin} from '../plugin/PluginContext';
import {createState} from '../state/atom';
import {DataTableColumn} from '../ui/data-table/DataTable';
import {MasterDetail} from '../ui/MasterDetail';
import {createDataSource} from '../state/createDataSource';

type PluginResult<Raw, Row> = {
  plugin(client: PluginClient<Record<string, Raw | {}>>): {
    rows: DataSource<Row>;
  };
  Component(): React.ReactElement;
};

/**
 * createTablePlugin creates a Plugin class which handles fetching data from the client and
 * displaying in in a table. The table handles selection of items and rendering a sidebar where
 * more detailed information can be presented about the selected row.
 *
 * The plugin expects the be able to subscribe to the `method` argument and recieve either an array
 * of data objects or a single data object. Each data object represents a row in the table which is
 * build by calling the `buildRow` function argument.
 *
 * An optional resetMethod argument can be provided which will replace the current rows with the
 * data provided. This is useful when connecting to Flipper for this first time, or reconnecting to
 * the client in an unknown state.
 */
export function createTablePlugin<Row extends object>(props: {
  method: string;
  resetMethod?: string;
  columns: DataTableColumn<Row>[];
  renderSidebar?: (record: Row) => any;
  key?: keyof Row;
  onCopyRows?(records: Row[]): string;
}): PluginResult<Row, Row>;
export function createTablePlugin<
  Raw extends object,
  Row extends object = Raw,
>(props: {
  buildRow: (record: Raw) => Row;
  method: string;
  resetMethod?: string;
  columns: DataTableColumn<Row>[];
  renderSidebar?: (record: Row) => any;
  key?: keyof Raw;
  onCopyRows?(records: Row[]): string;
}): PluginResult<Raw, Row>;
export function createTablePlugin<
  Raw extends object,
  Method extends string,
  ResetMethod extends string,
  Row extends object = Raw,
>(props: {
  method: Method;
  resetMethod?: ResetMethod;
  columns: DataTableColumn<Row>[];
  renderSidebar?: (record: Row) => any;
  buildRow?: (record: Raw) => Row;
  key?: keyof Raw;
  onCopyRows?(records: Row[]): string;
}) {
  function plugin(
    client: PluginClient<Record<Method, Raw> & Record<ResetMethod, {}>, {}>,
  ) {
    const rows = createDataSource<Row>([], {
      persist: 'rows',
      key: props.key,
    });
    const selection = createState<undefined | Row>(undefined);
    const isPaused = createState(false);

    client.onMessage(props.method, (event) => {
      if (isPaused.get()) {
        return;
      }
      const record = props.buildRow
        ? props.buildRow(event)
        : (event as any as Row);
      if (props.key) {
        rows.upsert(record);
      } else {
        rows.append(record);
      }
    });

    if (props.resetMethod) {
      client.onMessage(props.resetMethod, () => {
        rows.clear();
      });
    }

    // help plugin authors with finding out what the events and data shape is from the plugin
    const unhandledMessagesSeen = new Set<string>();
    client.onUnhandledMessage((message, params) => {
      if (unhandledMessagesSeen.has(message)) {
        return;
      }
      unhandledMessagesSeen.add(message);
      notification.warn({
        message: 'Unhandled message: ' + message,
        description: (
          <Typography.Paragraph>
            <pre>{JSON.stringify(params, null, 2)}</pre>
          </Typography.Paragraph>
        ),
      });
    });

    return {
      selection,
      rows,
      isPaused,
    };
  }

  function SidebarComponent({record}: {record: Row}) {
    return props.renderSidebar!(record);
  }

  function Component() {
    const instance = usePlugin(plugin);
    return (
      <MasterDetail<Row>
        columns={props.columns}
        dataSource={instance.rows}
        sidebarComponent={props.renderSidebar ? SidebarComponent : undefined}
        selection={instance.selection}
        isPaused={instance.isPaused}
        enableMenuEntries
        enableClear
        onCopyRows={props.onCopyRows}
      />
    );
  }

  return {plugin, Component};
}

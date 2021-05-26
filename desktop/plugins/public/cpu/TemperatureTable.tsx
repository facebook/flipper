/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Component, Text, SearchableTable} from 'flipper';
import React from 'react';

const ColumnSizes = {
  thermal_zone: 'flex',
  temperature: 'flex',
  path: 'flex',
};

const Columns = {
  thermal_zone: {
    value: 'Thermal Zone',
    resizable: true,
  },
  temperature: {
    value: 'Temperature',
    resizable: true,
  },
  path: {
    value: 'Path',
    resizable: true,
  },
};

type TemperatureTableProps = {
  temperatureMap: any;
};

export default class TemperatureTable extends Component<TemperatureTableProps> {
  buildRow = (tz: string, tempInfo: any) => {
    return {
      columns: {
        thermal_zone: {value: <Text>{tz}</Text>},
        temperature: {
          value: <Text>{tempInfo.temp.toString()}</Text>,
        },
        path: {
          value: <Text>{tempInfo.path}</Text>,
        },
      },
      key: tz,
    };
  };

  buildRows = () => {
    const rows = [];
    for (const tz of Object.keys(this.props.temperatureMap).sort()) {
      rows.push(this.buildRow(tz, this.props.temperatureMap[tz]));
    }
    return rows;
  };

  render() {
    return (
      <SearchableTable
        multiline
        autoHeight
        floating={false}
        zebra
        columnSizes={ColumnSizes}
        columns={Columns}
        rows={this.buildRows()}
        grow
      />
    );
  }
}

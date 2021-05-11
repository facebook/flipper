/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';

import {FlipperDevicePlugin, Device, KaiOSDevice, sleep} from 'flipper';

import {FlexColumn, Button, Toolbar, Panel} from 'flipper';

import {
  Legend,
  LineChart,
  Line,
  YAxis,
  XAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import adb from 'adbkit';
import {exec} from 'promisify-child-process';

const PALETTE = [
  '#FFD700',
  '#FF6347',
  '#8A2BE2',
  '#A52A2A',
  '#40E0D0',
  '#006400',
  '#ADFF2F',
  '#FF00FF',
];

// For now, let's limit the number of points shown
// The graph will automatically drop the oldest point if this number is reached
const MAX_POINTS = 100;

// This is to have some consistency in the Y axis scale
// Recharts should automatically adjust the axis if any data point gets above this value
const Y_AXIS_EXPECTED_MAX_MEM = 200;

const EXCLUDE_PROCESS_NAME_SUBSTRINGS = [
  '(Nuwa)',
  'Launcher',
  'Built-in',
  'Jio',
  '(Preallocated',
];

type DataPoint = {
  [key: string]: number;
};

type Colors = {
  [key: string]: string;
};

type State = {
  points: Array<DataPoint>;
  colors: Colors;
  monitoring: boolean;
};

export default class KaiOSGraphs extends FlipperDevicePlugin<State, any, any> {
  state = {
    points: [],
    colors: {},
    monitoring: false,
  };

  static supportsDevice(device: Device) {
    return device instanceof KaiOSDevice;
  }

  async init() {
    try {
      await exec('adb root');
    } catch (e) {
      console.error('Error obtaining root on the device', e);
    }
  }

  teardown() {
    this.onStopMonitor();
  }

  onStartMonitor = () => {
    this.setState(
      {
        monitoring: true,
      },
      () => {
        // no await because monitoring runs in the background
        this.monitorInBackground();
      },
    );
  };

  onStopMonitor = () => {
    this.setState({
      monitoring: false,
    });
  };

  monitorInBackground = async () => {
    while (this.state.monitoring) {
      await this.updateFreeMem();
      await sleep(1000);
    }
  };

  executeShell = (command: string) => {
    return (this.device as KaiOSDevice).adb
      .shell(this.device.serial, command)
      .then(adb.util.readAll)
      .then((output) => {
        return output.toString().trim();
      });
  };

  getMemory = () => {
    return this.executeShell('b2g-info').then((output) => {
      const lines = output.split('\n').map((line) => line.trim());
      let freeMem = null;
      for (const line of lines) {
        // TODO: regex validation
        if (line.startsWith('Free + cache')) {
          const fields = line.split(' ');
          const mem = fields[fields.length - 2];
          freeMem = parseFloat(mem);
        }
      }

      const appInfoData: {[key: string]: number} = {};
      let appInfoSectionFieldsCount;
      const appInfoSectionFieldToIndex: {[key: string]: number} = {};
      for (const line of lines) {
        if (line.startsWith('System memory info:')) {
          // We're outside of the app info section
          // Reset the counter, since it is used for detecting if we need to parse
          // app memory usage data
          appInfoSectionFieldsCount = undefined;
          break;
        }
        if (!line) {
          continue;
        }
        if (appInfoSectionFieldsCount) {
          let fields = line.trim().split(/\s+/);
          // Assume that only name field can contain spaces
          const name = fields
            .slice(0, -appInfoSectionFieldsCount + 1)
            .join(' ');
          const restOfTheFields = fields.slice(-appInfoSectionFieldsCount + 1);
          fields = [name, ...restOfTheFields];
          if (
            EXCLUDE_PROCESS_NAME_SUBSTRINGS.some((excludeSubstr) =>
              name.includes(excludeSubstr),
            )
          ) {
            continue;
          }
          if (fields[1].match(/\D+/)) {
            // TODO: probably implement this through something other than b2g
            throw new Error('Support for names with spaces is not implemented');
          }

          if (name !== 'b2g') {
            const ussString = fields[appInfoSectionFieldToIndex['USS']];
            const uss = ussString ? parseFloat(ussString) : -1;
            appInfoData[name + ' USS'] = uss;
          } else {
            const rssString = fields[appInfoSectionFieldToIndex['RSS']];
            const rss = rssString ? parseFloat(rssString) : -1;
            appInfoData[name + ' RSS'] = rss;
          }
        }
        if (line.startsWith('NAME')) {
          // We're in the app info section now
          const fields = line.trim().split(/\s+/);
          appInfoSectionFieldsCount = fields.length;
          for (let i = 0; i < fields.length; i++) {
            appInfoSectionFieldToIndex[fields[i]] = i;
          }
        }
      }
      return {'Total free': freeMem != null ? freeMem : -1, ...appInfoData};
    });
  };

  getColors = (point: DataPoint) => {
    const oldColors = this.state.colors;
    let newColors: Colors | null = null;
    let newColorsCount = 0;
    const existingNames = Object.keys(oldColors);
    for (const name of Object.keys(point)) {
      if (!(name in oldColors)) {
        if (!newColors) {
          newColors = {...oldColors};
        }
        newColors[name] = PALETTE[existingNames.length + newColorsCount];
        newColorsCount++;
      }
    }

    return newColors;
  };

  updateFreeMem = () => {
    // This can be improved by using immutable.js
    // If more points are necessary
    return this.getMemory().then((point) => {
      const points = [...this.state.points.slice(-MAX_POINTS + 1), point];
      const colors = this.getColors(point);
      let newState = {};
      if (colors) {
        newState = {colors, points};
      } else {
        newState = {points};
      }

      this.setState(newState);
    });
  };

  render() {
    const pointsToDraw = this.state.points.map((point, idx) => ({
      ...(point as Object),
      idx,
    }));
    const colors: Colors = this.state.colors;

    const names = Object.keys(colors);
    return (
      <Panel
        padded={false}
        heading="Free memory"
        floating={false}
        collapsable={false}
        grow>
        <Toolbar position="top">
          {this.state.monitoring ? (
            <Button onClick={this.onStopMonitor} icon="pause">
              Pause
            </Button>
          ) : (
            <Button onClick={this.onStartMonitor} icon="play">
              Start
            </Button>
          )}
        </Toolbar>
        <FlexColumn grow>
          <ResponsiveContainer height={500}>
            <LineChart data={pointsToDraw}>
              <XAxis type="number" domain={[0, MAX_POINTS]} dataKey="idx" />
              <YAxis type="number" domain={[0, Y_AXIS_EXPECTED_MAX_MEM]} />
              {names.map((name) => (
                <Line
                  key={`line-${name}`}
                  type="linear"
                  dataKey={name}
                  stroke={colors[name]}
                  isAnimationActive={false}
                />
              ))}
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
              <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </FlexColumn>
      </Panel>
    );
  }
}

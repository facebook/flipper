/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {SonarDevicePlugin} from 'sonar';
var adb = require('adbkit-fb');

import {
  FlexColumn,
  FlexRow,
  Button,
  Toolbar,
  Text,
  ManagedTable,
  colors,
} from 'sonar';

type ADBClient = any;
type AndroidDevice = any;
type TableRows = any;

// we keep vairable name with underline for to physical path mappings on device
type CPUFrequency = {|
  cpu_id: number,
  scaling_cur_freq: number,
  scaling_min_freq: number,
  scaling_max_freq: number,
  cpuinfo_max_freq: number,
  cpuinfo_min_freq: number,
|};

type CPUState = {|
  cpuFreq: Array<CPUFrequency>,
  cpuCount: number,
  monitoring: boolean,
|};

type ShellCallBack = (output: string) => void;

const ColumnSizes = {
  cpu_id: '10%',
  scaling_cur_freq: 'flex',
  scaling_min_freq: 'flex',
  scaling_max_freq: 'flex',
  cpuinfo_min_freq: 'flex',
  cpuinfo_max_freq: 'flex',
};

const Columns = {
  cpu_id: {
    value: 'CPU ID',
    resizable: true,
  },
  scaling_cur_freq: {
    value: 'Scaling Current',
    resizable: true,
  },
  scaling_min_freq: {
    value: 'Scaling MIN',
    resizable: true,
  },
  scaling_max_freq: {
    value: 'Scaling MAX',
    resizable: true,
  },
  cpuinfo_min_freq: {
    value: 'MIN Frequency',
    resizable: true,
  },
  cpuinfo_max_freq: {
    value: 'MAX Frequency',
    resizable: true,
  },
};

// check if str is a number
function isNormalInteger(str) {
  let n = Math.floor(Number(str));
  return String(n) === str && n >= 0;
}

// format frequency to MHz, GHz
function formatFrequency(freq) {
  if (freq == -1) {
    return 'N/A';
  } else if (freq == -2) {
    return 'off';
  } else if (freq > 1000 * 1000) {
    return (freq / 1000 / 1000).toFixed(2) + ' GHz';
  } else {
    return freq / 1000 + ' MHz';
  }
}

export default class CPUFrequencyTable extends SonarDevicePlugin<CPUState> {
  static id = 'DeviceCPU';
  static title = 'CPU';
  static icon = 'underline';

  adbClient: ADBClient;
  intervalID: ?IntervalID;
  device: AndroidDevice;

  init() {
    this.setState({
      cpuFreq: [],
      cpuCount: 0,
      monitoring: false,
    });

    this.adbClient = this.device.adb;

    // check how many cores we have on this device
    this.executeShell((output: string) => {
      let idx = output.indexOf('-');
      let cpuFreq = [];
      let count = parseInt(output.substring(idx + 1), 10) + 1;
      for (let i = 0; i < count; ++i) {
        cpuFreq[i] = {
          cpu_id: i,
          scaling_cur_freq: -1,
          scaling_min_freq: -1,
          scaling_max_freq: -1,
          cpuinfo_min_freq: -1,
          cpuinfo_max_freq: -1,
        };
      }
      this.setState({
        cpuCount: count,
        cpuFreq: cpuFreq,
      });
    }, 'cat /sys/devices/system/cpu/possible');
  }

  executeShell = (callback: ShellCallBack, command: string) => {
    this.adbClient
      .shell(this.device.serial, command)
      .then(adb.util.readAll)
      .then(function(output) {
        return callback(output.toString().trim());
      });
  };

  updateCoreFrequency = (core: number, type: string) => {
    this.executeShell((output: string) => {
      let cpuFreq = this.state.cpuFreq;
      let newFreq = isNormalInteger(output) ? parseInt(output, 10) : -1;

      // update table only if frequency changed
      if (cpuFreq[core][type] != newFreq) {
        cpuFreq[core][type] = newFreq;
        if (type == 'scaling_cur_freq' && cpuFreq[core][type] < 0) {
          // cannot find current freq means offline
          cpuFreq[core][type] = -2;
        }

        this.setState({
          cpuFreq: cpuFreq,
        });
      }
    }, 'cat /sys/devices/system/cpu/cpu' + core + '/cpufreq/' + type);
  };

  readCoreFrequency = (core: number) => {
    let freq = this.state.cpuFreq[core];
    if (freq.cpuinfo_max_freq < 0) {
      this.updateCoreFrequency(core, 'cpuinfo_max_freq');
    }
    if (freq.cpuinfo_min_freq < 0) {
      this.updateCoreFrequency(core, 'cpuinfo_min_freq');
    }
    this.updateCoreFrequency(core, 'scaling_cur_freq');
    this.updateCoreFrequency(core, 'scaling_min_freq');
    this.updateCoreFrequency(core, 'scaling_max_freq');
  };

  onStartMonitor = () => {
    if (this.intervalID) {
      return;
    }

    this.intervalID = setInterval(() => {
      for (let i = 0; i < this.state.cpuCount; ++i) {
        this.readCoreFrequency(i);
      }
    }, 500);

    this.setState({
      monitoring: true,
    });
  };

  onStopMonitor = () => {
    if (!this.intervalID) {
      return;
    } else {
      clearInterval(this.intervalID);
      this.intervalID = null;
      this.setState({
        monitoring: false,
      });
      this.cleanup();
    }
  };

  cleanup = () => {
    let cpuFreq = this.state.cpuFreq;
    for (let i = 0; i < this.state.cpuCount; ++i) {
      cpuFreq[i].scaling_cur_freq = -1;
      cpuFreq[i].scaling_min_freq = -1;
      cpuFreq[i].scaling_max_freq = -1;
      // we don't cleanup cpuinfo_min_freq, cpuinfo_max_freq
      // because usually they are fixed (hardware)
    }
    this.setState({
      cpuFreq: cpuFreq,
    });
  };

  teardown = () => {
    this.cleanup();
  };

  buildRow = (freq: CPUFrequency) => {
    let style = {};
    if (freq.scaling_cur_freq == -2) {
      style = {
        style: {
          backgroundColor: colors.blueTint30,
          color: colors.white,
          fontWeight: 700,
        },
      };
    } else if (
      freq.scaling_min_freq != freq.cpuinfo_min_freq &&
      freq.scaling_min_freq > 0 &&
      freq.cpuinfo_min_freq > 0
    ) {
      style = {
        style: {
          backgroundColor: colors.redTint,
          color: colors.red,
          fontWeight: 700,
        },
      };
    } else if (
      freq.scaling_max_freq != freq.cpuinfo_max_freq &&
      freq.scaling_max_freq > 0 &&
      freq.cpuinfo_max_freq > 0
    ) {
      style = {
        style: {
          backgroundColor: colors.yellowTint,
          color: colors.yellow,
          fontWeight: 700,
        },
      };
    }

    return {
      columns: {
        cpu_id: {value: <Text>CPU_{freq.cpu_id}</Text>},
        scaling_cur_freq: {
          value: <Text>{formatFrequency(freq.scaling_cur_freq)}</Text>,
        },
        scaling_min_freq: {
          value: <Text>{formatFrequency(freq.scaling_min_freq)}</Text>,
        },
        scaling_max_freq: {
          value: <Text>{formatFrequency(freq.scaling_max_freq)}</Text>,
        },
        cpuinfo_min_freq: {
          value: <Text>{formatFrequency(freq.cpuinfo_min_freq)}</Text>,
        },
        cpuinfo_max_freq: {
          value: <Text>{formatFrequency(freq.cpuinfo_max_freq)}</Text>,
        },
      },
      key: freq.cpu_id,
      style,
    };
  };

  frequencyRows = (cpuFreqs: Array<CPUFrequency>): TableRows => {
    let rows = [];
    for (const cpuFreq of cpuFreqs) {
      rows.push(this.buildRow(cpuFreq));
    }
    return rows;
  };

  render() {
    return (
      <FlexRow>
        <FlexColumn fill={true}>
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
          <ManagedTable
            multiline={true}
            columnSizes={ColumnSizes}
            columns={Columns}
            autoHeight={true}
            floating={false}
            zebra={true}
            rows={this.frequencyRows(this.state.cpuFreq)}
          />
        </FlexColumn>
      </FlexRow>
    );
  }
}

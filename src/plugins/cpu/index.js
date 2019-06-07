/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {FlipperDevicePlugin, Device} from 'flipper';
var adb = require('adbkit-fb');

import {
  FlexColumn,
  FlexRow,
  Button,
  Toolbar,
  Text,
  ManagedTable,
  colors,
  styled,
  Panel,
  DetailSidebar,
} from 'flipper';

type ADBClient = any;
type AndroidDevice = {
  adb: ADBClient,
};
type TableRows = any;

// we keep vairable name with underline for to physical path mappings on device
type CPUFrequency = {|
  cpu_id: number,
  scaling_cur_freq: number,
  scaling_min_freq: number,
  scaling_max_freq: number,
  scaling_available_freqs: Array<number>,
  scaling_governor: string,
  scaling_available_governors: Array<string>,
  cpuinfo_max_freq: number,
  cpuinfo_min_freq: number,
|};

type CPUState = {|
  cpuFreq: Array<CPUFrequency>,
  cpuCount: number,
  monitoring: boolean,
  hardwareInfo: string,
  selectedIds: Array<number>,
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
  scaling_governor: {
    value: 'Scaling Governor',
    resizable: true,
  },
};

const Heading = styled('div')({
  fontWeight: 'bold',
  fontSize: 13,
  display: 'block',
  marginBottom: 10,
  '&:not(:first-child)': {
    marginTop: 20,
  },
});

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

export default class CPUFrequencyTable extends FlipperDevicePlugin<CPUState> {
  adbClient: ADBClient;
  intervalID: ?IntervalID;

  state = {
    cpuFreq: [],
    cpuCount: 0,
    monitoring: false,
    hardwareInfo: '',
    selectedIds: [],
  };

  static supportsDevice(device: Device) {
    return device.os === 'Android' && device.deviceType === 'physical';
  }

  init() {
    let device = ((this.device: any): AndroidDevice);
    this.adbClient = device.adb;

    this.updateHardwareInfo();

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
          scaling_available_freqs: [],
          scaling_governor: 'N/A',
          scaling_available_governors: [],
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

  updateAvailableFrequencies = (core: number) => {
    this.executeShell((output: string) => {
      let cpuFreq = this.state.cpuFreq;
      let freqs = output.split(' ').map((num: string) => {
        return parseInt(num, 10);
      });
      cpuFreq[core].scaling_available_freqs = freqs;
      let maxFreq = cpuFreq[core].scaling_max_freq;
      if (maxFreq > 0 && freqs.indexOf(maxFreq) == -1) {
        freqs.push(maxFreq); // always add scaling max to available frequencies
      }
      this.setState({
        cpuFreq: cpuFreq,
      });
    }, 'cat /sys/devices/system/cpu/cpu' + core + '/cpufreq/scaling_available_frequencies');
  };

  updateCoreGovernor = (core: number) => {
    this.executeShell((output: string) => {
      let cpuFreq = this.state.cpuFreq;
      cpuFreq[core].scaling_governor = output;
      this.setState({
        cpuFreq: cpuFreq,
      });
    }, 'cat /sys/devices/system/cpu/cpu' + core + '/cpufreq/scaling_governor');
  };

  readAvailableGovernors = (core: number) => {
    this.executeShell((output: string) => {
      let cpuFreq = this.state.cpuFreq;
      cpuFreq[core].scaling_available_governors = output.split(' ');

      this.setState({
        cpuFreq: cpuFreq,
      });
    }, 'cat /sys/devices/system/cpu/cpu' + core + '/cpufreq/scaling_available_governors');
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

  updateHardwareInfo = () => {
    this.executeShell((output: string) => {
      let hwInfo = '';
      if (
        output.startsWith('msm') ||
        output.startsWith('apq') ||
        output.startsWith('sdm')
      ) {
        hwInfo = 'QUALCOMM ' + output.toUpperCase();
      } else if (output.startsWith('exynos')) {
        this.executeShell((output: string) => {
          if (output != null) {
            this.setState({
              hardwareInfo: 'SAMSUMG ' + output.toUpperCase(),
            });
          }
        }, 'getprop ro.chipname');
        return;
      } else if (output.startsWith('mt')) {
        hwInfo = 'MEDIATEK ' + output.toUpperCase();
      } else if (output.startsWith('sc')) {
        hwInfo = 'SPREADTRUM ' + output.toUpperCase();
      } else if (output.startsWith('hi') || output.startsWith('kirin')) {
        hwInfo = 'HISILICON ' + output.toUpperCase();
      } else if (output.startsWith('rk')) {
        hwInfo = 'ROCKCHIP ' + output.toUpperCase();
      } else if (output.startsWith('bcm')) {
        hwInfo = 'BROADCOM ' + output.toUpperCase();
      }
      this.setState({
        hardwareInfo: hwInfo,
      });
    }, 'getprop ro.board.platform');
  };

  onStartMonitor = () => {
    if (this.intervalID) {
      return;
    }
    for (let i = 0; i < this.state.cpuCount; ++i) {
      this.readAvailableGovernors(i);
    }

    this.intervalID = setInterval(() => {
      for (let i = 0; i < this.state.cpuCount; ++i) {
        this.readCoreFrequency(i);
        this.updateCoreGovernor(i);
        this.updateAvailableFrequencies(i); // scaling max might change, so we also update this
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
      cpuFreq[i].scaling_available_freqs = [];
      cpuFreq[i].scaling_governor = 'N/A';
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

  buildRow = (freq: CPUFrequency, idx: number) => {
    let selected = this.state.selectedIds.indexOf(idx) >= 0;
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
          backgroundColor: selected ? colors.red : colors.redTint,
          // better visibility when highlighted
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
        scaling_governor: {
          value: <Text>{freq.scaling_governor}</Text>,
        },
      },
      key: freq.cpu_id,

      style,
    };
  };

  frequencyRows = (cpuFreqs: Array<CPUFrequency>): TableRows => {
    return cpuFreqs.map(this.buildRow);
  };

  buildAvailableFreqList = (freq: CPUFrequency) => {
    if (freq.scaling_available_freqs.length == 0) {
      return <Text>N/A</Text>;
    }
    let info = freq;
    return (
      <Text>
        {freq.scaling_available_freqs.map((freq, idx) => {
          let style = {};
          if (
            freq == info.scaling_cur_freq ||
            freq == info.scaling_min_freq ||
            freq == info.scaling_max_freq
          ) {
            style.fontWeight = 'bold';
          }
          return (
            <Text key={idx} style={style}>
              {formatFrequency(freq)}
              {freq == info.scaling_cur_freq && (
                <Text style={style}> (scaling current)</Text>
              )}
              {freq == info.scaling_min_freq && (
                <Text style={style}> (scaling min)</Text>
              )}
              {freq == info.scaling_max_freq && (
                <Text style={style}> (scaling max)</Text>
              )}
              <br />
            </Text>
          );
        })}
      </Text>
    );
  };

  buildAvailableGovList = (freq: CPUFrequency): string => {
    if (freq.scaling_available_governors.length == 0) {
      return 'N/A';
    }
    return freq.scaling_available_governors.join(', ');
  };

  buildSidebarRow = (key: string, val: any) => {
    return {
      columns: {
        key: {value: <Text>{key}</Text>},
        value: {
          value: val,
        },
      },
      key: key,
    };
  };

  sidebarRows = (id: number) => {
    let availableFreqTitle = 'Scaling Available Frequencies';
    let selected = this.state.cpuFreq[id];
    if (selected.scaling_available_freqs.length > 0) {
      availableFreqTitle +=
        ' (' + selected.scaling_available_freqs.length.toString() + ')';
    }

    let keys = [availableFreqTitle, 'Scaling Available Governors'];

    let vals = [
      this.buildAvailableFreqList(selected),
      this.buildAvailableGovList(selected),
    ];
    return keys.map<any>((key, idx) => {
      return this.buildSidebarRow(key, vals[idx]);
    });
  };

  renderSidebar = () => {
    if (this.state.selectedIds.length == 0) {
      return null;
    }
    let id = this.state.selectedIds[0];
    let cols = {
      key: {
        value: 'key',
        resizable: true,
      },
      value: {
        value: 'value',
        resizable: true,
      },
    };
    let colSizes = {
      key: '35%',
      value: 'flex',
    };
    return (
      <DetailSidebar width={500}>
        <Panel
          padded={true}
          heading="CPU details"
          floating={false}
          collapsable={true}>
          <Heading>CPU_{id}</Heading>
          <ManagedTable
            columnSizes={colSizes}
            multiline={true}
            columns={cols}
            autoHeight={true}
            floating={false}
            zebra={true}
            rows={this.sidebarRows(id)}
          />
        </Panel>
      </DetailSidebar>
    );
  };

  render() {
    return (
      <FlexRow>
        <FlexColumn grow={true}>
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
            &nbsp; {this.state.hardwareInfo}
          </Toolbar>
          <ManagedTable
            multiline={true}
            columnSizes={ColumnSizes}
            columns={Columns}
            autoHeight={true}
            floating={false}
            zebra={true}
            rows={this.frequencyRows(this.state.cpuFreq)}
            onRowHighlighted={selectedIds => {
              this.setState({
                selectedIds: selectedIds,
              });
            }}
          />

          {this.renderSidebar()}
        </FlexColumn>
      </FlexRow>
    );
  }
}

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  createState,
  PluginClient,
  usePlugin,
  useValue,
  Panel,
  theme,
  Layout,
  DetailSidebar,
  DataTable,
  DataTableColumn,
} from 'flipper-plugin';
import adb from 'adbkit';
import TemperatureTable from './TemperatureTable';
import {Button, Typography, Switch} from 'antd';
import {PlayCircleOutlined, PauseCircleOutlined} from '@ant-design/icons';

import React, {useCallback, useState} from 'react';

// we keep vairable name with underline for to physical path mappings on device
type CPUFrequency = {
  [index: string]: number | Array<number> | string | Array<string>;
  cpu_id: number;
  scaling_cur_freq: number;
  scaling_min_freq: number;
  scaling_max_freq: number;
  scaling_available_freqs: Array<number>;
  scaling_governor: string;
  scaling_available_governors: Array<string>;
  cpuinfo_max_freq: number;
  cpuinfo_min_freq: number;
};

type CPUState = {
  cpuFreq: Array<CPUFrequency>;
  cpuCount: number;
  monitoring: boolean;
  hardwareInfo: string;
  temperatureMap: any;
  thermalAccessible: boolean;
  displayThermalInfo: boolean;
  displayCPUDetail: boolean;
};

type ShellCallBack = (output: string) => any;

// check if str is a number
function isNormalInteger(str: string) {
  const n = Math.floor(Number(str));
  return String(n) === str && n >= 0;
}

// format frequency to MHz, GHz
function formatFrequency(freq: number) {
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

export function devicePlugin(client: PluginClient<{}, {}>) {
  const device = client.device;

  const executeShell = (callback: ShellCallBack, command: string) => {
    return (device.realDevice as any).adb
      .shell(device.serial, command)
      .then(adb.util.readAll)
      .then(function (output: {toString: () => {trim: () => string}}) {
        return callback(output.toString().trim());
      });
  };

  let intervalID: NodeJS.Timer | null = null;
  const cpuState = createState<CPUState>({
    cpuCount: 0,
    cpuFreq: [],
    monitoring: false,
    hardwareInfo: '',
    temperatureMap: {},
    thermalAccessible: true,
    displayThermalInfo: false,
    displayCPUDetail: true,
  });

  const updateCoreFrequency: (core: number, type: string) => Promise<void> = (
    core: number,
    type: string,
  ) => {
    return new Promise((resolve, _reject) => {
      executeShell((output: string) => {
        cpuState.update((draft) => {
          const newFreq = isNormalInteger(output) ? parseInt(output, 10) : -1;
          // update table only if frequency changed
          if (draft.cpuFreq[core][type] != newFreq) {
            draft.cpuFreq[core][type] = newFreq;
            if (type == 'scaling_cur_freq' && draft.cpuFreq[core][type] < 0) {
              // cannot find current freq means offline
              draft.cpuFreq[core][type] = -2;
            }
          }
          return draft;
        });
        resolve();
      }, 'cat /sys/devices/system/cpu/cpu' + core + '/cpufreq/' + type);
    });
  };

  const updateAvailableFrequencies: (core: number) => Promise<void> = (
    core: number,
  ) => {
    return new Promise((resolve, _reject) => {
      executeShell((output: string) => {
        cpuState.update((draft) => {
          const freqs = output.split(' ').map((num: string) => {
            return parseInt(num, 10);
          });
          draft.cpuFreq[core].scaling_available_freqs = freqs;
          const maxFreq = draft.cpuFreq[core].scaling_max_freq;
          if (maxFreq > 0 && freqs.indexOf(maxFreq) == -1) {
            freqs.push(maxFreq); // always add scaling max to available frequencies
          }
          return draft;
        });
        resolve();
      }, 'cat /sys/devices/system/cpu/cpu' + core + '/cpufreq/scaling_available_frequencies');
    });
  };

  const updateCoreGovernor: (core: number) => Promise<void> = (
    core: number,
  ) => {
    return new Promise((resolve, _reject) => {
      executeShell((output: string) => {
        cpuState.update((draft) => {
          if (output.toLowerCase().includes('no such file')) {
            draft.cpuFreq[core].scaling_governor = 'N/A';
          } else {
            draft.cpuFreq[core].scaling_governor = output;
          }
          return draft;
        });
        resolve();
      }, 'cat /sys/devices/system/cpu/cpu' + core + '/cpufreq/scaling_governor');
    });
  };

  const readAvailableGovernors: (core: number) => Promise<string[]> = (
    core: number,
  ) => {
    return new Promise((resolve, _reject) => {
      executeShell((output: string) => {
        // draft.cpuFreq[core].scaling_available_governors = output.split(' ');
        resolve(output.split(' '));
      }, 'cat /sys/devices/system/cpu/cpu' + core + '/cpufreq/scaling_available_governors');
    });
  };

  const readCoreFrequency = async (core: number) => {
    const freq = cpuState.get().cpuFreq[core];
    const promises = [];
    if (freq.cpuinfo_max_freq < 0) {
      promises.push(updateCoreFrequency(core, 'cpuinfo_max_freq'));
    }
    if (freq.cpuinfo_min_freq < 0) {
      promises.push(updateCoreFrequency(core, 'cpuinfo_min_freq'));
    }
    promises.push(updateCoreFrequency(core, 'scaling_cur_freq'));
    promises.push(updateCoreFrequency(core, 'scaling_min_freq'));
    promises.push(updateCoreFrequency(core, 'scaling_max_freq'));
    return Promise.all(promises).then(() => {});
  };

  const updateHardwareInfo = () => {
    executeShell((output: string) => {
      let hwInfo = '';
      if (
        output.startsWith('msm') ||
        output.startsWith('apq') ||
        output.startsWith('sdm')
      ) {
        hwInfo = 'QUALCOMM ' + output.toUpperCase();
      } else if (output.startsWith('exynos')) {
        executeShell((output: string) => {
          if (output != null) {
            cpuState.update((draft) => {
              draft.hardwareInfo = 'SAMSUMG ' + output.toUpperCase();
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
      cpuState.update((draft) => {
        draft.hardwareInfo = hwInfo;
        return draft;
      });
    }, 'getprop ro.board.platform');
  };

  const readThermalZones = () => {
    const thermal_dir = '/sys/class/thermal/';
    const map = {};
    executeShell(async (output: string) => {
      if (output.toLowerCase().includes('permission denied')) {
        cpuState.update((draft) => {
          draft.thermalAccessible = false;
          return draft;
        });
        return;
      }
      const dirs = output.split(/\s/);
      const promises = [];
      for (let d of dirs) {
        d = d.trim();
        if (d.length == 0) {
          continue;
        }
        const path = thermal_dir + d;
        promises.push(readThermalZone(path, d, map));
      }
      await Promise.all(promises);
      cpuState.update((draft) => {
        draft.temperatureMap = map;
        draft.thermalAccessible = true;
        return draft;
      });
      if (cpuState.get().displayThermalInfo) {
        setTimeout(readThermalZones, 1000);
      }
    }, 'ls ' + thermal_dir);
  };

  const readThermalZone = (path: string, dir: string, map: any) => {
    return executeShell((type: string) => {
      if (type.length == 0) {
        return;
      }
      return executeShell((temp: string) => {
        if (Number.isNaN(Number(temp))) {
          return;
        }
        map[type] = {
          path: dir,
          temp: parseInt(temp, 10),
        };
      }, 'cat ' + path + '/temp');
    }, 'cat ' + path + '/type');
  };

  const onStartMonitor = () => {
    if (cpuState.get().monitoring) {
      return;
    }

    cpuState.update((draft) => {
      draft.monitoring = true;
    });

    for (let i = 0; i < cpuState.get().cpuCount; ++i) {
      readAvailableGovernors(i).then((output) => {
        cpuState.update((draft) => {
          draft.cpuFreq[i].scaling_available_governors = output;
        });
      });
    }

    const update = async () => {
      if (!cpuState.get().monitoring) {
        return;
      }
      const promises = [];
      for (let i = 0; i < cpuState.get().cpuCount; ++i) {
        promises.push(readCoreFrequency(i));
        promises.push(updateCoreGovernor(i));
        promises.push(updateAvailableFrequencies(i)); // scaling max might change, so we also update this
      }
      await Promise.all(promises);
      intervalID = setTimeout(update, 500);
    };

    intervalID = setTimeout(update, 500);
  };

  const onStopMonitor = () => {
    intervalID && clearInterval(intervalID);
    intervalID = null;
    cpuState.update((draft) => {
      draft.monitoring = false;
      return draft;
    });
  };

  const cleanup = () => {
    cpuState.update((draft) => {
      for (let i = 0; i < draft.cpuCount; ++i) {
        draft.cpuFreq[i].scaling_cur_freq = -1;
        draft.cpuFreq[i].scaling_min_freq = -1;
        draft.cpuFreq[i].scaling_max_freq = -1;
        draft.cpuFreq[i].scaling_available_freqs = [];
        draft.cpuFreq[i].scaling_governor = 'N/A';
        // we don't cleanup cpuinfo_min_freq, cpuinfo_max_freq
        // because usually they are fixed (hardware)
      }
    });
  };

  const toggleThermalSidebar = () => {
    if (!cpuState.get().displayThermalInfo) {
      readThermalZones();
    }
    cpuState.update((draft) => {
      draft.displayThermalInfo = !draft.displayThermalInfo;
      draft.displayCPUDetail = false;
      return draft;
    });
  };

  const toggleCPUSidebar = () => {
    cpuState.update((draft) => {
      draft.displayCPUDetail = !draft.displayCPUDetail;
      draft.displayThermalInfo = false;
      return draft;
    });
  };

  // check how many cores we have on this device
  executeShell((output: string) => {
    const idx = output.indexOf('-');
    const cpuFreq = [];
    const count = parseInt(output.substring(idx + 1), 10) + 1;
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
    cpuState.set({
      cpuCount: count,
      cpuFreq: cpuFreq,
      monitoring: false,
      hardwareInfo: '',
      temperatureMap: {},
      thermalAccessible: true,
      displayThermalInfo: false,
      displayCPUDetail: true,
    });
  }, 'cat /sys/devices/system/cpu/possible');

  client.onDeactivate(() => cleanup());
  client.onActivate(() => {
    updateHardwareInfo();
    readThermalZones();
  });

  return {
    executeShell,
    cpuState,
    onStartMonitor,
    onStopMonitor,
    toggleCPUSidebar,
    toggleThermalSidebar,
  };
}

const columns: DataTableColumn[] = [
  {key: 'cpu_id', title: 'CPU ID'},
  {key: 'scaling_cur_freq', title: 'Current Frequency'},
  {key: 'scaling_min_freq', title: 'Scaling min'},
  {key: 'scaling_max_freq', title: 'Scaling max'},
  {key: 'cpuinfo_min_freq', title: 'CPU min'},
  {key: 'cpuinfo_max_freq', title: 'CPU max'},
  {key: 'scaling_governor', title: 'Scaling governor'},
];

const cpuSidebarColumns: DataTableColumn[] = [
  {
    key: 'key',
    title: 'key',
    wrap: true,
  },
  {
    key: 'value',
    title: 'value',
    wrap: true,
  },
];

const getRowStyle = (freq: CPUFrequency) => {
  if (freq.scaling_cur_freq == -2) {
    return {
      backgroundColor: theme.backgroundWash,
      color: theme.textColorPrimary,
      fontWeight: 700,
    };
  } else if (
    freq.scaling_min_freq != freq.cpuinfo_min_freq &&
    freq.scaling_min_freq > 0 &&
    freq.cpuinfo_min_freq > 0
  ) {
    return {
      backgroundColor: theme.warningColor,
      color: theme.textColorPrimary,
      fontWeight: 700,
    };
  } else if (
    freq.scaling_max_freq != freq.cpuinfo_max_freq &&
    freq.scaling_max_freq > 0 &&
    freq.cpuinfo_max_freq > 0
  ) {
    return {
      backgroundColor: theme.backgroundWash,
      color: theme.textColorSecondary,
      fontWeight: 700,
    };
  }
};

export function Component() {
  const instance = usePlugin(devicePlugin);
  const {
    onStartMonitor,
    onStopMonitor,
    toggleCPUSidebar,
    toggleThermalSidebar,
  } = instance;

  const cpuState = useValue(instance.cpuState);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const buildRow = (freq: CPUFrequency) => {
    return {
      core: freq.cpu_id,
      cpu_id: `CPU_${freq.cpu_id}`,
      scaling_cur_freq: formatFrequency(freq.scaling_cur_freq),
      scaling_min_freq: formatFrequency(freq.scaling_min_freq),
      scaling_max_freq: formatFrequency(freq.scaling_max_freq),
      cpuinfo_min_freq: formatFrequency(freq.cpuinfo_min_freq),
      cpuinfo_max_freq: formatFrequency(freq.cpuinfo_max_freq),
      scaling_governor: freq.scaling_governor,
    };
  };

  const frequencyRows = (cpuFreqs: Array<CPUFrequency>) => {
    return cpuFreqs.map(buildRow);
  };

  const buildAvailableFreqList = (freq: CPUFrequency) => {
    if (freq.scaling_available_freqs.length == 0) {
      return <Typography.Text>N/A</Typography.Text>;
    }
    const info = freq;
    return (
      <Typography.Text>
        {freq.scaling_available_freqs.map((freq, idx) => {
          const bold =
            freq == info.scaling_cur_freq ||
            freq == info.scaling_min_freq ||
            freq == info.scaling_max_freq;
          return (
            <Typography.Text key={idx} strong={bold}>
              {formatFrequency(freq)}
              {freq == info.scaling_cur_freq && (
                <Typography.Text strong={bold}>
                  {' '}
                  (scaling current)
                </Typography.Text>
              )}
              {freq == info.scaling_min_freq && (
                <Typography.Text strong={bold}> (scaling min)</Typography.Text>
              )}
              {freq == info.scaling_max_freq && (
                <Typography.Text strong={bold}> (scaling max)</Typography.Text>
              )}
              <br />
            </Typography.Text>
          );
        })}
      </Typography.Text>
    );
  };

  const buildAvailableGovList = (freq: CPUFrequency): string => {
    if (freq.scaling_available_governors.length == 0) {
      return 'N/A';
    }
    return freq.scaling_available_governors.join(', ');
  };

  const buildSidebarRow = (key: string, val: any) => {
    return {
      key: key,
      value: val,
    };
  };

  const sidebarRows = (id: number) => {
    let availableFreqTitle = 'Scaling Available Frequencies';
    const selected = cpuState.cpuFreq[id];
    if (selected.scaling_available_freqs.length > 0) {
      availableFreqTitle +=
        ' (' + selected.scaling_available_freqs.length.toString() + ')';
    }

    const keys = [availableFreqTitle, 'Scaling Available Governors'];

    const vals = [
      buildAvailableFreqList(selected),
      buildAvailableGovList(selected),
    ];
    return keys.map<any>((key, idx) => {
      return buildSidebarRow(key, vals[idx]);
    });
  };

  const renderCPUSidebar = () => {
    if (!cpuState.displayCPUDetail || selectedIds.length == 0) {
      return null;
    }
    const id = selectedIds[0];
    return (
      <DetailSidebar width={500}>
        <Typography.Title>CPU Details: CPU_{id}</Typography.Title>
        <DataTable
          records={sidebarRows(id)}
          columns={cpuSidebarColumns}
          scrollable={false}
        />
      </DetailSidebar>
    );
  };

  const renderThermalSidebar = () => {
    if (!cpuState.displayThermalInfo) {
      return null;
    }
    return (
      <DetailSidebar width={500}>
        <Panel
          pad={theme.space.small}
          title="Thermal Information"
          collapsible={false}>
          {cpuState.thermalAccessible ? (
            <TemperatureTable temperatureMap={cpuState.temperatureMap} />
          ) : (
            'Temperature information not accessible on this device.'
          )}
        </Panel>
      </DetailSidebar>
    );
  };

  const setSelected = useCallback((selected: any) => {
    setSelectedIds(selected ? [selected.core] : []);
  }, []);

  return (
    <Layout.Container pad={theme.space.medium}>
      <Typography.Title>CPU Info</Typography.Title>
      <Layout.Horizontal gap={theme.space.small} center>
        {cpuState.monitoring ? (
          <Button onClick={onStopMonitor} icon={<PauseCircleOutlined />}>
            Pause
          </Button>
        ) : (
          <Button onClick={onStartMonitor} icon={<PlayCircleOutlined />}>
            Start
          </Button>
        )}
        &nbsp; {cpuState.hardwareInfo}
        <Switch
          checked={cpuState.displayThermalInfo}
          onClick={toggleThermalSidebar}
        />
        Thermal Information
        <Switch
          onClick={toggleCPUSidebar}
          checked={cpuState.displayCPUDetail}
        />
        CPU Details
        {cpuState.displayCPUDetail &&
          selectedIds.length == 0 &&
          ' (Please select a core in the table below)'}
      </Layout.Horizontal>

      <DataTable
        records={frequencyRows(cpuState.cpuFreq)}
        columns={columns}
        scrollable={false}
        onSelect={setSelected}
        onRowStyle={getRowStyle}
      />
      {renderCPUSidebar()}
      {renderThermalSidebar()}
    </Layout.Container>
  );
}

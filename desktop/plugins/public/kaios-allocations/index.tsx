/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {FlipperDevicePlugin, Device, KaiOSDevice} from 'flipper';

import {
  Button,
  Toolbar,
  ManagedTable,
  Panel,
  Label,
  Input,
  Select,
} from 'flipper';

import {sleep} from 'flipper';

import util from 'util';
import {exec} from 'promisify-child-process';

import FirefoxClient from 'firefox-client';
import BaseClientMethods from 'firefox-client/lib/client-methods';
import extend from 'firefox-client/lib/extend';

// This uses legacy `extend` from `firefox-client`, since this seems to be what the implementation expects
// It's probably possible to rewrite this in a modern way and properly type it, but for now leaving this as it is
const ClientMethods: any = extend(BaseClientMethods, {
  initialize: function (client: any, actor: any) {
    this.client = client;
    this.actor = actor;

    this.cb = function (this: typeof ClientMethods, message: any) {
      if (message.from === this.actor) {
        this.emit(message.type, message);
      }
    }.bind(this);

    this.client.on('message', this.cb);
  },

  disconnect: function () {
    this.client.removeListener('message', this.cb);
  },
});

function Memory(this: typeof ClientMethods, client: any, actor: any): any {
  this.initialize(client, actor);
}

// Repetitive, it is probably better to refactor this
// to use API like `runCommand(commandName, params): Promise`
Memory.prototype = extend(ClientMethods, {
  attach: function (cb: any) {
    this.request('attach', function (err: any, resp: any) {
      cb(err, resp);
    });
  },

  getState: function (cb: any) {
    this.request('getState', function (err: any, resp: any) {
      cb(err, resp);
    });
  },

  takeCensus: function (cb: any) {
    this.request('takeCensus', function (err: any, resp: any) {
      cb(err, resp);
    });
  },

  getAllocations: function (cb: any) {
    this.request('getAllocations', function (err: any, resp: any) {
      cb(err, resp);
    });
  },

  startRecordingAllocations: function (options: any, cb: any) {
    this.request(
      'startRecordingAllocations',
      {options},
      function (err: any, resp: any) {
        cb(err, resp);
      },
    );
  },

  stopRecordingAllocations: function (cb: any) {
    this.request('stopRecordingAllocations', function (err: any, resp: any) {
      cb(err, resp);
    });
  },

  measure: function (cb: any) {
    this.request('measure', function (err: any, resp: any) {
      cb(err, resp);
    });
  },

  getAllocationsSettings: function (cb: any) {
    this.request('getAllocationsSettings', function (err: any, resp: any) {
      cb(err, resp);
    });
  },
});

const ffPromisify = (o: {[key: string]: any}, m: string) =>
  util.promisify(o[m].bind(o));

const ColumnSizes = {
  timestamp: 'flex',
  freeMem: 'flex',
};

const Columns = {
  timestamp: {
    value: 'time',
    resizable: true,
  },
  allocationSize: {
    value: 'Allocation bytes',
    resizable: true,
  },
  functionName: {
    value: 'Function',
    resizable: true,
  },
};

type Allocation = {
  timestamp: number;
  allocationSize: number;
  functionName: string;
};

type State = {
  apps: {[key: string]: string};
  runningAppName: null | string;
  allocationData: Array<Allocation>;
  totalAllocations: number;
  totalAllocatedBytes: number;
  monitoring: boolean;
  allocationsBySize: {[key: string]: number};
  minAllocationSizeInTable: number;
};

const LOCALSTORAGE_APP_NAME_KEY = '__KAIOS_ALLOCATIONS_PLUGIN_CACHED_APP_NAME';
const LOCALSTORAGE_MIN_ALLOCATION_SIZE_KEY =
  '__KAIOS_ALLOCATIONS_PLUGIN_MIN_ALLOCATION_SIZE';
const DEFAULT_MIN_ALLOCATION_SIZE = 128;

function getMinAllocationSizeFromLocalStorage(): number {
  const ls = localStorage.getItem(LOCALSTORAGE_MIN_ALLOCATION_SIZE_KEY);
  if (!ls) {
    return DEFAULT_MIN_ALLOCATION_SIZE;
  }
  const parsed = parseInt(ls, 10);
  return !isNaN(parsed) ? parsed : DEFAULT_MIN_ALLOCATION_SIZE;
}

export default class AllocationsPlugin extends FlipperDevicePlugin<
  State,
  any,
  any
> {
  currentApp: any = null;
  memory: any = null;
  client: any = null;
  webApps: any = null;

  state: State = {
    apps: {},
    runningAppName: null,
    monitoring: false,
    allocationData: [],
    totalAllocations: 0,
    totalAllocatedBytes: 0,
    allocationsBySize: {},
    minAllocationSizeInTable: getMinAllocationSizeFromLocalStorage(),
  };

  static supportsDevice(device: Device) {
    return device instanceof KaiOSDevice;
  }

  onStartMonitor = async () => {
    if (this.state.monitoring) {
      return;
    }
    // TODO: try to reconnect in case of failure
    await ffPromisify(
      this.memory,
      'startRecordingAllocations',
    )({
      probability: 1.0,
      maxLogLength: 20000,
      drainAllocationsTimeout: 1500,
      trackingAllocationSites: true,
    });
    this.setState({monitoring: true});
  };

  onStopMonitor = async () => {
    if (!this.state.monitoring) {
      return;
    }
    this.tearDownApp();
    this.setState({monitoring: false});
  };

  // reloads the list of apps every two seconds
  reloadAppListWhenNotMonitoring = async () => {
    while (true) {
      if (!this.state.monitoring) {
        try {
          await this.processListOfApps();
        } catch (e) {
          console.error('Exception, attempting to reconnect', e);
          await this.connectToDebugApi();
          // processing the list of the apps is going to be automatically retried now
        }
      }

      await sleep(2000);
    }
  };

  async connectToDebugApi(): Promise<void> {
    this.client = new FirefoxClient({log: false});
    await ffPromisify(this.client, 'connect')(6000, 'localhost');
    this.webApps = await ffPromisify(this.client, 'getWebapps')();
  }

  async processListOfApps(): Promise<void> {
    const runningAppUrls = await ffPromisify(this.webApps, 'listRunningApps')();

    const lastUsedAppName = localStorage.getItem(LOCALSTORAGE_APP_NAME_KEY);
    let runningAppName = null;
    const appTitleToUrl: {[key: string]: string} = {};
    for (const runningAppUrl of runningAppUrls) {
      const app = await ffPromisify(this.webApps, 'getApp')(runningAppUrl);
      appTitleToUrl[app.title] = runningAppUrl;
      if (app.title === lastUsedAppName) {
        runningAppName = app.title;
      }
    }

    if (runningAppName && this.state.runningAppName !== runningAppName) {
      this.setUpApp(appTitleToUrl[runningAppName]);
    }

    this.setState({
      apps: appTitleToUrl,
      runningAppName,
    });
  }

  async init() {
    await exec(
      'adb forward tcp:6000 localfilesystem:/data/local/debugger-socket',
    );
    await this.connectToDebugApi();
    await this.processListOfApps();
    // no await because reloading runs in the background
    this.reloadAppListWhenNotMonitoring();
  }

  async teardown() {
    if (this.state.monitoring) {
      await this.onStopMonitor();
    }
  }

  async setUpApp(appUrl: string) {
    this.currentApp = await ffPromisify(this.webApps, 'getApp')(appUrl);
    if (!this.currentApp) {
      // TODO: notify user?
      throw new Error('Cannot connect to app');
    }

    const {
      tab: {memoryActor},
    } = this.currentApp;
    this.memory = new (Memory as any)(this.currentApp.client, memoryActor);
    await ffPromisify(this.memory, 'attach')();
    this.currentApp.client.on('message', this.processAllocationsMsg);
  }

  async tearDownApp() {
    if (!this.currentApp) {
      return;
    }
    this.currentApp.client.off('message', this.processAllocationsMsg);
    await ffPromisify(this.memory, 'stopRecordingAllocations')();
    this.currentApp = null;
    this.memory = null;
  }

  processAllocationsMsg = (msg: any) => {
    if (msg.type !== 'allocations') {
      return;
    }
    this.updateAllocations(msg.data);
  };

  updateAllocations = (data: any) => {
    const {allocations, allocationsTimestamps, allocationSizes, frames} = data;
    const newAllocationData = [...this.state.allocationData];
    let newTotalAllocations = this.state.totalAllocations;
    let newTotalAllocatedBytes = this.state.totalAllocatedBytes;
    const newAllocationsBySize = {...this.state.allocationsBySize};
    for (let i = 0; i < allocations.length; ++i) {
      const frameId = allocations[i];
      const timestamp = allocationsTimestamps[i];
      const allocationSize = allocationSizes[i];
      const functionName = frames[frameId]
        ? frames[frameId].functionDisplayName
        : null;
      if (allocationSize >= this.state.minAllocationSizeInTable) {
        newAllocationData.push({timestamp, allocationSize, functionName});
      }
      newAllocationsBySize[allocationSize] =
        (newAllocationsBySize[allocationSize] || 0) + 1;
      newTotalAllocations++;
      newTotalAllocatedBytes += allocationSize;
    }
    this.setState({
      allocationData: newAllocationData,
      totalAllocations: newTotalAllocations,
      totalAllocatedBytes: newTotalAllocatedBytes,
      allocationsBySize: newAllocationsBySize,
    });
  };

  buildMemRows = () => {
    return this.state.allocationData.map((info) => {
      return {
        columns: {
          timestamp: {
            value: info.timestamp,
            filterValue: info.timestamp,
          },
          allocationSize: {
            value: info.allocationSize,
            filterValue: info.allocationSize,
          },
          functionName: {
            value: info.functionName,
            filterValue: info.functionName,
          },
        },
        key: `${info.timestamp} ${info.allocationSize} ${info.functionName}`,
        copyText: `${info.timestamp} ${info.allocationSize} ${info.functionName}`,
        filterValue: `${info.timestamp} ${info.allocationSize} ${info.functionName}`,
      };
    });
  };

  onAppChange = (newAppTitle: string) => {
    localStorage[LOCALSTORAGE_APP_NAME_KEY] = newAppTitle;
    this.setState({runningAppName: newAppTitle});
    this.tearDownApp();
    this.setUpApp(this.state.apps[newAppTitle]);
  };

  onMinAllocationSizeChange = (event: any) => {
    const newMinAllocationSize = event.target.value;
    this.setState({
      minAllocationSizeInTable: newMinAllocationSize,
    });
  };

  render() {
    const appTitlesForSelect: {[key: string]: string} = {};

    for (const [appTitle] of Object.entries(this.state.apps)) {
      appTitlesForSelect[appTitle] = appTitle;
    }

    return (
      <React.Fragment>
        <Panel
          padded={false}
          heading="Page allocations"
          floating={false}
          collapsable={false}
          grow>
          <Toolbar position="top">
            <Select
              options={appTitlesForSelect}
              onChangeWithKey={this.onAppChange}
              selected={this.state.runningAppName}
              disabled={this.state.monitoring}
            />

            {this.state.monitoring ? (
              <Button onClick={this.onStopMonitor} icon="pause">
                Pause
              </Button>
            ) : (
              <Button onClick={this.onStartMonitor} icon="play">
                Start
              </Button>
            )}
            <Label>
              Min allocation size in bytes{' '}
              <Input
                placeholder="min bytes"
                value={this.state.minAllocationSizeInTable}
                type="number"
                onChange={this.onMinAllocationSizeChange}
                disabled={this.state.monitoring}
              />
            </Label>
          </Toolbar>

          <Label>
            Total number of allocations: {this.state.totalAllocations}
          </Label>
          <br />
          <Label>
            Total MBs allocated:{' '}
            {(this.state.totalAllocatedBytes / 1024 / 1024).toFixed(3)}
          </Label>
          <ManagedTable
            multiline
            columnSizes={ColumnSizes}
            columns={Columns}
            floating={false}
            zebra
            rows={this.buildMemRows()}
          />
        </Panel>
      </React.Fragment>
    );
  }
}

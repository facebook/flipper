/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {serialize} from './serialization';
import {State as PluginStatesState} from '../reducers/pluginStates';
import {Store} from '../reducers';
import fs from 'fs';
import {
  ExportType,
  fetchMetadata,
  determinePluginsToProcess,
} from './exportData';
import {deserializeObject} from './serialization';
import {deconstructPluginKey} from './clientUtils';
import {pluginsClassMap} from './pluginUtils';
import {PluginDefinition, isSandyPlugin} from '../plugin';

export type MetricType = {[metricName: string]: number};
type MetricPluginType = {[pluginID: string]: MetricType};
export type ExportMetricType = {[clientID: string]: MetricPluginType};

async function exportMetrics(
  pluginStates: PluginStatesState,
  pluginsMap: Map<string, PluginDefinition>,
  selectedPlugins: Array<string>,
): Promise<string> {
  const metrics: ExportMetricType = {};
  for (const key in pluginStates) {
    const pluginStateData = pluginStates[key];

    const plugin = deconstructPluginKey(key);
    const pluginName = plugin.pluginName;
    if (
      pluginName === undefined ||
      (selectedPlugins.length > 0 && !selectedPlugins.includes(pluginName))
    ) {
      continue;
    }
    const client = plugin.client;
    const pluginClass = pluginsMap.get(pluginName);
    const metricsReducer:
      | (<U>(persistedState: U) => Promise<MetricType>)
      | undefined =
      pluginClass && !isSandyPlugin(pluginClass) // This feature doesn't seem to be used at all, so let's add it when needed for Sandy
        ? pluginClass.metricsReducer
        : undefined;
    if (pluginsMap.has(pluginName) && metricsReducer) {
      const metricsObject = await metricsReducer(pluginStateData);
      const pluginObject: MetricPluginType = {};
      pluginObject[pluginName] = metricsObject;
      if (!metrics[client]) {
        metrics[client] = pluginObject;
        continue;
      }
      const mergedMetrics = {...metrics[client], ...pluginObject};
      metrics[client] = mergedMetrics;
    }
  }
  return Promise.resolve(await serialize(metrics));
}

export async function exportMetricsWithoutTrace(
  store: Store,
  pluginStates: PluginStatesState,
): Promise<string | null> {
  const pluginsMap = pluginsClassMap(store.getState().plugins);
  const {clients, selectedDevice} = store.getState().connections;
  const pluginsToProcess = determinePluginsToProcess(
    clients,
    selectedDevice,
    store.getState().plugins,
  );
  const metadata = await fetchMetadata(
    pluginsToProcess,
    pluginStates,
    store.getState(),
  );
  const newPluginStates = metadata.pluginStates;
  const {errors} = metadata;
  if (errors) {
    console.error(errors);
  }

  const metrics = await exportMetrics(
    newPluginStates,
    pluginsMap,
    store.getState().plugins.selectedPlugins,
  );
  return metrics;
}

function parseJSON(str: string): any {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

export async function exportMetricsFromTrace(
  trace: string,
  pluginsMap: Map<string, PluginDefinition>,
  selectedPlugins: Array<string>,
): Promise<string> {
  const data = fs.readFileSync(trace, 'utf8');
  const parsedJSONData = parseJSON(data);
  if (!parsedJSONData) {
    return Promise.reject(
      new Error('Please pass the file which has a valid JSON'),
    );
  }
  const importedData: ExportType = deserializeObject(parsedJSONData);
  const importedStore = importedData.store;
  if (!importedStore) {
    return Promise.reject(
      new Error(
        'No store in the imported file, thus exiting without exporting metrics.',
      ),
    );
  }

  const {pluginStates} = importedStore;

  if (!pluginStates) {
    return Promise.reject(
      new Error(
        'No pluginStates in the imported file, thus exiting without exporting metrics.',
      ),
    );
  }
  return await exportMetrics(pluginStates, pluginsMap, selectedPlugins);
}

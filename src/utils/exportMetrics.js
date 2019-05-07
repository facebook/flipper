/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import type {FlipperPlugin, FlipperDevicePlugin} from 'flipper';
import {serialize} from './serialization';
import type {MiddlewareAPI} from '../reducers';

export type MetricType = {[metricName: string]: number};
type MetricPluginType = {[pluginID: string]: MetricType};
export type ExportMetricType = {[clientID: string]: MetricPluginType};

export default async function exportMetrics(
  store: MiddlewareAPI,
): Promise<string> {
  const state = store.getState();
  const metrics: ExportMetricType = {};
  for (let key in state.pluginStates) {
    const pluginStateData = state.pluginStates[key];
    const arr = key.split('#');
    const pluginName = arr.pop();
    const clientID = arr.join('#');
    const pluginsMap: Map<
      string,
      Class<FlipperDevicePlugin<> | FlipperPlugin<>>,
    > = new Map([]);
    state.plugins.clientPlugins.forEach((val, key) => {
      pluginsMap.set(key, val);
    });
    state.plugins.devicePlugins.forEach((val, key) => {
      pluginsMap.set(key, val);
    });
    const metricsReducer: ?(
      persistedState: any,
    ) => Promise<MetricType> = pluginsMap.get(pluginName)?.metricsReducer;
    if (pluginsMap.has(pluginName) && metricsReducer) {
      const metricsObject = await metricsReducer(pluginStateData);
      const pluginObject = {};
      pluginObject[pluginName] = metricsObject;
      if (!metrics[clientID]) {
        metrics[clientID] = pluginObject;
        continue;
      }
      const mergedMetrics = {...metrics[clientID], ...pluginObject};
      metrics[clientID] = mergedMetrics;
    }
  }
  return Promise.resolve(serialize(metrics));
}

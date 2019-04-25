/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import type {MiddlewareAPI} from '../reducers';
import {serialize} from './serialization.js';
import type {FlipperPlugin, FlipperDevicePlugin} from 'flipper';

type MetricType = Map<string, Map<string, string | number>>;

export type ExportMetricType = Map<string, MetricType>;

export default async function exportMetrics(
  store: MiddlewareAPI,
): Promise<string> {
  const state = store.getState();
  let metrics: ExportMetricType = new Map();
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
    const exportMetrics1: ?(
      persistedState: any,
    ) => Promise<Map<string, string | number>> = pluginsMap.get(pluginName)
      ?.exportMetrics;
    if (pluginsMap.has(pluginName) && exportMetrics1) {
      const metricMap = await exportMetrics1(pluginStateData);
      const pluginMap = new Map([[pluginName, metricMap]]);
      if (!metrics.get(clientID)) {
        metrics.set(clientID, pluginMap);
        continue;
      }
      const prevMetricMap = metrics.get(clientID);
      // $FlowFixMe: prevMetricMap cannot be null, because clientID is added only when the pluingMetricMap is available
      metrics.set(clientID, new Map([...prevMetricMap, ...pluginMap]));
    }
  }
  return Promise.resolve(serialize(metrics));
}

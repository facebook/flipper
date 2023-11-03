/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  Atom,
  DataTableManagerLegacy as DataTableManager,
  getFlipperLib,
} from 'flipper-plugin';
import {createContext} from 'react';
import {Header, Request} from '../types';

export type Route = {
  requestUrl: string;
  requestMethod: string;
  responseData: string;
  responseHeaders: {[id: string]: Header};
  responseStatus: string;
  enabled: boolean;
};

export type MockRoute = {
  requestUrl: string;
  method: string;
  data: string;
  headers: Header[];
  status: string;
  enabled: boolean;
};

export interface NetworkRouteManager {
  addRoute(): string | undefined;
  modifyRoute(id: string, routeChange: Partial<Route>): void;
  removeRoute(id: string): void;
  enableRoute(id: string): void;
  copySelectedCalls(): void;
  importRoutes(): void;
  exportRoutes(): void;
  clearRoutes(): void;
}

export const nullNetworkRouteManager: NetworkRouteManager = {
  addRoute(): string | undefined {
    return '';
  },
  modifyRoute(_id: string, _routeChange: Partial<Route>) {},
  removeRoute(_id: string) {},
  enableRoute(_id: string) {},
  copySelectedCalls() {},
  importRoutes() {},
  exportRoutes() {},
  clearRoutes() {},
};

export const NetworkRouteContext = createContext<NetworkRouteManager>(
  nullNetworkRouteManager,
);

export function createNetworkManager(
  nextRouteId: Atom<number>,
  routes: Atom<{[id: string]: any}>,
  informClientMockChange: (routes: {[id: string]: any}) => Promise<void>,
  tableManagerRef: React.RefObject<DataTableManager<Request> | undefined>,
): NetworkRouteManager {
  return {
    addRoute(): string | undefined {
      const newNextRouteId = nextRouteId.get();
      routes.update((draft) => {
        draft[newNextRouteId.toString()] = {
          requestUrl: '',
          requestMethod: 'GET',
          responseData: '',
          responseHeaders: {},
          responseStatus: '200',
          enabled: true,
        };
      });
      nextRouteId.set(newNextRouteId + 1);
      return String(newNextRouteId);
    },
    modifyRoute(id: string, routeChange: Partial<Route>) {
      if (!routes.get().hasOwnProperty(id)) {
        return;
      }
      routes.update((draft) => {
        Object.assign(draft[id], routeChange);
      });
      informClientMockChange(routes.get());
    },
    removeRoute(id: string) {
      if (routes.get().hasOwnProperty(id)) {
        routes.update((draft) => {
          delete draft[id];
        });
      }
      informClientMockChange(routes.get());
    },
    enableRoute(id: string) {
      if (routes.get().hasOwnProperty(id)) {
        routes.update((draft) => {
          draft[id].enabled = !draft[id].enabled;
        });
      }
      informClientMockChange(routes.get());
    },
    copySelectedCalls() {
      tableManagerRef.current?.getSelectedItems().forEach((request) => {
        // convert headers
        const headers: {[id: string]: Header} = {};
        request.responseHeaders?.forEach((e) => {
          headers[e.key] = e;
        });

        // no need to convert data, already converted when real call was created
        const responseData =
          request && request.responseData ? request.responseData : '';

        const newNextRouteId = nextRouteId.get();
        routes.update((draft) => {
          draft[newNextRouteId.toString()] = {
            requestUrl: request.url,
            requestMethod: request.method,
            responseData: responseData as string,
            responseHeaders: headers,
            responseStatus: request.status?.toString() ?? '',
            enabled: true,
          };
        });
        nextRouteId.set(newNextRouteId + 1);
      });

      informClientMockChange(routes.get());
    },
    importRoutes() {
      getFlipperLib()
        .importFile({
          extensions: ['.json'],
        })
        .then((res) => {
          if (res) {
            if (res.encoding !== 'utf-8' || typeof res.data !== 'string') {
              return;
            }
            const importedRoutes = JSON.parse(res.data);
            importedRoutes?.forEach((importedRoute: Route) => {
              if (importedRoute != null) {
                const newNextRouteId = nextRouteId.get();
                routes.update((draft) => {
                  draft[newNextRouteId.toString()] = {
                    requestUrl: importedRoute.requestUrl,
                    requestMethod: importedRoute.requestMethod,
                    responseData: importedRoute.responseData as string,
                    responseHeaders: importedRoute.responseHeaders,
                    responseStatus: importedRoute.responseStatus,
                    enabled: true,
                  };
                });
                nextRouteId.set(newNextRouteId + 1);
              }
            });
            informClientMockChange(routes.get());
          }
        })
        .catch((e) =>
          console.error('[network] importRoutes dialogue failed:', e),
        );
    },
    exportRoutes() {
      getFlipperLib()
        .exportFile(JSON.stringify(Object.values(routes.get()), null, 2), {
          defaultPath: 'NetworkPluginRoutesExport.json',
        })
        .catch((e) =>
          console.error('[network] exportRoutes saving failed:', e),
        );
    },
    clearRoutes() {
      routes.set({});
      informClientMockChange(routes.get());
    },
  };
}

export function computeMockRoutes(routes: {[id: string]: Route}) {
  const existedIdSet: {[id: string]: {[method: string]: boolean}} = {};
  const filteredRoutes: {[id: string]: Route} = Object.entries(routes).reduce(
    (accRoutes, [id, route]) => {
      if (existedIdSet.hasOwnProperty(route.requestUrl)) {
        if (
          existedIdSet[route.requestUrl].hasOwnProperty(route.requestMethod)
        ) {
          return accRoutes;
        }
        existedIdSet[route.requestUrl] = {
          ...existedIdSet[route.requestUrl],
          [route.requestMethod]: true,
        };
        return Object.assign({[id]: route}, accRoutes);
      } else {
        existedIdSet[route.requestUrl] = {
          [route.requestMethod]: true,
        };
        return Object.assign({[id]: route}, accRoutes);
      }
    },
    {},
  );
  return filteredRoutes;
}

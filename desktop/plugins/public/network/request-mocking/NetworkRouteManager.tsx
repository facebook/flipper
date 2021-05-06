/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs';
// eslint-disable-next-line
import electron, {OpenDialogOptions, remote} from 'electron';
import {Atom, DataTableManager} from 'flipper-plugin';
import {createContext} from 'react';
import {Header, Request} from '../types';
import {decodeBody} from '../utils';
import {message} from 'antd';

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
  copyHighlightedCalls(): void;
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
  copyHighlightedCalls() {},
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
    copyHighlightedCalls() {
      tableManagerRef.current?.getSelectedItems().forEach((request) => {
        // convert headers
        const headers: {[id: string]: Header} = {};
        request.responseHeaders?.forEach((e) => {
          headers[e.key] = e;
        });

        // convert data TODO: we only want this for non-binary data! See D23403095
        const responseData =
          request && request.responseData
            ? decodeBody({
                headers: request.responseHeaders ?? [],
                data: request.responseData,
              })
            : '';

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
      const options: OpenDialogOptions = {
        properties: ['openFile'],
        filters: [{extensions: ['json'], name: 'Flipper Route Files'}],
      };
      remote.dialog.showOpenDialog(options).then((result) => {
        const filePaths = result.filePaths;
        if (filePaths.length > 0) {
          fs.readFile(filePaths[0], 'utf8', (err, data) => {
            if (err) {
              message.error('Unable to import file');
              return;
            }
            const importedRoutes = JSON.parse(data);
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
          });
        }
      });
    },
    exportRoutes() {
      remote.dialog
        .showSaveDialog(
          // @ts-ignore This appears to work but isn't allowed by the types
          null,
          {
            title: 'Export Routes',
            defaultPath: 'NetworkPluginRoutesExport.json',
          },
        )
        .then((result: electron.SaveDialogReturnValue) => {
          const file = result.filePath;
          if (!file) {
            return;
          }
          fs.writeFile(
            file,
            JSON.stringify(Object.values(routes.get()), null, 2),
            'utf8',
            (err) => {
              if (err) {
                message.error('Failed to store mock routes: ' + err);
              } else {
                message.info('Successfully exported mock routes');
              }
            },
          );
        });
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

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import {MockResponseDetails} from './MockResponseDetails';
import {NetworkRouteContext, Route} from './NetworkRouteManager';
import {RequestId} from '../types';
import {Checkbox, Modal, Tooltip, Button, Typography} from 'antd';
import {
  NUX,
  Layout,
  DataList,
  Toolbar,
  createState,
  useValue,
} from 'flipper-plugin';
import {CloseCircleOutlined, WarningOutlined} from '@ant-design/icons';

const {Text} = Typography;

type Props = {
  routes: {[id: string]: Route};
};

type RouteItem = {
  id: string;
  title: string;
  route: Route;
  isDuplicate: boolean;
};

// return ids that have the same pair of requestUrl and method; this will return only the duplicate
function _duplicateIds(routes: {[id: string]: Route}): Array<RequestId> {
  const idSet: {[id: string]: {[method: string]: boolean}} = {};
  return Object.entries(routes).reduce((acc: Array<RequestId>, [id, route]) => {
    if (idSet.hasOwnProperty(route.requestUrl)) {
      if (idSet[route.requestUrl].hasOwnProperty(route.requestMethod)) {
        return acc.concat(id);
      }
      idSet[route.requestUrl] = {
        ...idSet[route.requestUrl],
        [route.requestMethod]: true,
      };
      return acc;
    } else {
      idSet[route.requestUrl] = {[route.requestMethod]: true};
      return acc;
    }
  }, []);
}

export function ManageMockResponsePanel(props: Props) {
  const networkRouteManager = useContext(NetworkRouteContext);
  const [selectedIdAtom] = useState(() => createState<RequestId | undefined>());
  const selectedId = useValue(selectedIdAtom);

  useEffect(() => {
    selectedIdAtom.update((selectedId) => {
      const keys = Object.keys(props.routes);
      let returnValue: string | undefined = undefined;
      // selectId is undefined when there are no rows or it is the first time rows are shown
      if (selectedId === undefined) {
        if (keys.length === 0) {
          // there are no rows
          returnValue = undefined;
        } else {
          // first time rows are shown
          returnValue = keys[0];
        }
      } else {
        if (keys.includes(selectedId)) {
          returnValue = selectedId;
        } else {
          // selectedId row value not in routes so default to first line
          returnValue = keys[0];
        }
      }
      return returnValue;
    });
  }, [props.routes, selectedIdAtom]);
  const duplicatedIds = useMemo(
    () => _duplicateIds(props.routes),
    [props.routes],
  );

  const items: RouteItem[] = Object.entries(props.routes).map(
    ([id, route]) => ({
      id,
      route,
      title: route.requestUrl,
      isDuplicate: duplicatedIds.includes(id),
    }),
  );

  const handleDelete = useCallback(
    (id: string) => {
      Modal.confirm({
        title: 'Are you sure you want to delete this item?',
        icon: '',
        onOk() {
          networkRouteManager.removeRoute(id);
          selectedIdAtom.set(undefined);
        },
        onCancel() {},
      });
    },
    [networkRouteManager, selectedIdAtom],
  );
  const handleToggle = useCallback(
    (id: string) => {
      networkRouteManager.enableRoute(id);
    },
    [networkRouteManager],
  );

  const handleRender = useCallback(
    (item: RouteItem) => (
      <RouteEntry item={item} onDelete={handleDelete} onToggle={handleToggle} />
    ),
    [handleDelete, handleToggle],
  );

  const handleSelect = useCallback(
    (id: string) => {
      if (id) {
        selectedIdAtom.set(id);
      }
    },
    [selectedIdAtom],
  );

  return (
    <Layout.Left resizable style={{minHeight: 400}}>
      <Layout.Top>
        <Toolbar>
          <Button
            onClick={() => {
              const newId = networkRouteManager.addRoute();
              selectedIdAtom.set(newId);
            }}>
            Add Route
          </Button>
          <NUX
            title="It is now possible to select calls from the network call list and convert them into mock routes."
            placement="bottom">
            <Button
              onClick={() => {
                networkRouteManager.copySelectedCalls();
              }}>
              Copy Selected Calls
            </Button>
          </NUX>
          <Button onClick={networkRouteManager.importRoutes}>Import</Button>
          <Button onClick={networkRouteManager.exportRoutes}>Export</Button>
          <Button onClick={networkRouteManager.clearRoutes}>Clear</Button>
        </Toolbar>
        <DataList
          items={items}
          selection={selectedId}
          onRenderItem={handleRender}
          onSelect={handleSelect}
          scrollable
        />
      </Layout.Top>
      <Layout.Container gap pad>
        {selectedId && props.routes.hasOwnProperty(selectedId) && (
          <MockResponseDetails
            id={selectedId}
            route={props.routes[selectedId]}
            isDuplicated={duplicatedIds.includes(selectedId)}
          />
        )}
      </Layout.Container>
    </Layout.Left>
  );
}

const RouteEntry = ({
  item,
  onToggle,
  onDelete,
}: {
  item: RouteItem;
  onToggle(id: string): void;
  onDelete(id: string): void;
}) => {
  const tip = item.route.enabled
    ? 'Un-check to disable mock route'
    : 'Check to enable mock route';
  return (
    <Layout.Horizontal gap center>
      <Tooltip title={tip} mouseEnterDelay={1.1}>
        <Checkbox
          onClick={() => onToggle(item.id)}
          checked={item.route.enabled}></Checkbox>
      </Tooltip>
      {item.route.requestUrl.length === 0 ? (
        <Text ellipsis>untitled</Text>
      ) : (
        <Text ellipsis>{item.route.requestUrl}</Text>
      )}
      <Tooltip title="Click to delete mock route" mouseEnterDelay={1.1}>
        <Layout.Horizontal onClick={() => onDelete(item.id)}>
          <CloseCircleOutlined />
        </Layout.Horizontal>
      </Tooltip>
      {item.isDuplicate && <WarningOutlined />}
    </Layout.Horizontal>
  );
};

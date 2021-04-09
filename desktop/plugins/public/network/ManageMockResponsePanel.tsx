/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  Button,
  ManagedTable,
  Text,
  Glyph,
  styled,
  colors,
  Panel,
} from 'flipper';
import React, {useContext, useState, useMemo, useEffect} from 'react';
import {Route, Request, Response} from './types';
import {MockResponseDetails} from './MockResponseDetails';
import {NetworkRouteContext} from './index';
import {RequestId} from './types';
import {message, Checkbox, Modal, Tooltip} from 'antd';
import {NUX, Layout} from 'flipper-plugin';

type Props = {
  routes: {[id: string]: Route};
  highlightedRows: Set<string> | null | undefined;
  requests: {[id: string]: Request};
  responses: {[id: string]: Response};
};

const ColumnSizes = {route: 'flex'};

const Columns = {route: {value: 'Route', resizable: false}};

const TextEllipsis = styled(Text)({
  overflowX: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%',
  lineHeight: '18px',
  paddingTop: 4,
  display: 'block',
  whiteSpace: 'nowrap',
});

const Icon = styled(Glyph)({
  marginTop: 5,
  marginRight: 8,
});

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

function _buildRows(
  routes: {[id: string]: Route},
  duplicatedIds: Array<string>,
  handleRemoveId: (id: string) => void,
  handleEnableId: (id: string) => void,
) {
  return Object.entries(routes).map(([id, route]) => ({
    columns: {
      route: {
        value: (
          <RouteRow
            key={id}
            text={route.requestUrl}
            showWarning={duplicatedIds.includes(id)}
            handleRemoveId={() => handleRemoveId(id)}
            handleEnableId={() => handleEnableId(id)}
            enabled={route.enabled}
          />
        ),
      },
    },
    key: id,
  }));
}

function RouteRow(props: {
  text: string;
  showWarning: boolean;
  handleRemoveId: () => void;
  handleEnableId: () => void;
  enabled: boolean;
}) {
  const tip = props.enabled
    ? 'Un-check to disable mock route'
    : 'Check to enable mock route';
  return (
    <Layout.Horizontal gap>
      <Tooltip title={tip} mouseEnterDelay={1.1}>
        <Checkbox
          onClick={props.handleEnableId}
          checked={props.enabled}></Checkbox>
      </Tooltip>
      <Tooltip title="Click to delete mock route" mouseEnterDelay={1.1}>
        <Layout.Horizontal onClick={props.handleRemoveId}>
          <Icon name="cross-circle" color={colors.red} />
        </Layout.Horizontal>
      </Tooltip>
      {props.showWarning && (
        <Icon name="caution-triangle" color={colors.yellow} />
      )}
      {props.text.length === 0 ? (
        <TextEllipsis style={{color: colors.blackAlpha50}}>
          untitled
        </TextEllipsis>
      ) : (
        <TextEllipsis>{props.text}</TextEllipsis>
      )}
    </Layout.Horizontal>
  );
}

function ManagedMockResponseRightPanel(props: {
  id: string;
  route: Route;
  isDuplicated: boolean;
}) {
  const {id, route, isDuplicated} = props;
  return (
    <Panel
      grow={true}
      collapsable={false}
      floating={false}
      heading={'Route Info'}>
      <MockResponseDetails
        key={id}
        id={id}
        route={route}
        isDuplicated={isDuplicated}
      />
    </Panel>
  );
}

export function ManageMockResponsePanel(props: Props) {
  const networkRouteManager = useContext(NetworkRouteContext);
  const [selectedId, setSelectedId] = useState<RequestId | null>(null);

  useEffect(() => {
    setSelectedId((selectedId) => {
      const keys = Object.keys(props.routes);
      let returnValue: string | null = null;
      // selectId is null when there are no rows or it is the first time rows are shown
      if (selectedId === null) {
        if (keys.length === 0) {
          // there are no rows
          returnValue = null;
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
  }, [props.routes]);
  const duplicatedIds = useMemo(() => _duplicateIds(props.routes), [
    props.routes,
  ]);

  function getSelectedIds(): Set<string> {
    const newSet = new Set<string>();
    newSet.add(selectedId ?? '');
    return newSet;
  }

  function getPreviousId(id: string): string | null {
    const keys = Object.keys(props.routes);
    const currentIndex = keys.indexOf(id);
    if (currentIndex == 0) {
      return null;
    } else {
      return keys[currentIndex - 1];
    }
  }

  function getNextId(id: string): string | null {
    const keys = Object.keys(props.routes);
    const currentIndex = keys.indexOf(id);
    if (currentIndex >= keys.length - 1) {
      return getPreviousId(id);
    } else {
      return keys[currentIndex + 1];
    }
  }

  return (
    <Layout.Container style={{height: 550}}>
      <Layout.Left>
        <Layout.Container width={450} pad={10} gap={5}>
          <Layout.Horizontal gap>
            <Button
              onClick={() => {
                const newId = networkRouteManager.addRoute();
                setSelectedId(newId);
              }}>
              Add Route
            </Button>
            <NUX
              title="It is now possible to highlight calls from the network call list and convert them into mock routes."
              placement="bottom">
              <Button
                onClick={() => {
                  if (
                    !props.highlightedRows ||
                    props.highlightedRows.size == 0
                  ) {
                    message.info('No network calls have been highlighted');
                    return;
                  }
                  networkRouteManager.copyHighlightedCalls(
                    props.highlightedRows as Set<string>,
                    props.requests,
                    props.responses,
                  );
                }}>
                Copy Highlighted Calls
              </Button>
            </NUX>
          </Layout.Horizontal>
          <Panel
            padded={false}
            grow={true}
            collapsable={false}
            floating={false}
            heading={'Routes'}>
            <ManagedTable
              hideHeader={true}
              multiline={false}
              columnSizes={ColumnSizes}
              columns={Columns}
              rows={_buildRows(
                props.routes,
                duplicatedIds,
                (id) => {
                  Modal.confirm({
                    title: 'Are you sure you want to delete this item?',
                    icon: '',
                    onOk() {
                      const nextId = getNextId(id);
                      networkRouteManager.removeRoute(id);
                      setSelectedId(nextId);
                    },
                    onCancel() {},
                  });
                },
                (id) => {
                  networkRouteManager.enableRoute(id);
                },
              )}
              stickyBottom={true}
              autoHeight={false}
              floating={false}
              zebra={false}
              onRowHighlighted={(selectedIds) => {
                const newSelectedId =
                  selectedIds.length === 1 ? selectedIds[0] : null;
                setSelectedId(newSelectedId);
              }}
              highlightedRows={getSelectedIds()}
            />
          </Panel>
        </Layout.Container>
        <Layout.Container>
          {selectedId && props.routes.hasOwnProperty(selectedId) && (
            <ManagedMockResponseRightPanel
              id={selectedId}
              route={props.routes[selectedId]}
              isDuplicated={duplicatedIds.includes(selectedId)}
            />
          )}
        </Layout.Container>
      </Layout.Left>
    </Layout.Container>
  );
}

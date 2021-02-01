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

import {message} from 'antd';
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
}) {
  return (
    <Layout.Horizontal>
      <Layout.Horizontal onClick={props.handleRemoveId}>
        <Icon name="cross-circle" color={colors.red} />
      </Layout.Horizontal>
      <Layout.Horizontal>
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
      return keys.length === 0
        ? null
        : selectedId === null || !keys.includes(selectedId)
        ? keys[keys.length - 1]
        : selectedId;
    });
  }, [props.routes]);
  const duplicatedIds = useMemo(() => _duplicateIds(props.routes), [
    props.routes,
  ]);
  return (
    <Layout.Container style={{height: 550}}>
      <Layout.Left>
        <Layout.Container width={450} pad={10} gap={5}>
          <Layout.Horizontal gap>
            <Button
              onClick={() => {
                networkRouteManager.addRoute();
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
              rows={_buildRows(props.routes, duplicatedIds, (id) => {
                networkRouteManager.removeRoute(id);
                setSelectedId(null);
              })}
              stickyBottom={true}
              autoHeight={false}
              floating={false}
              zebra={false}
              onRowHighlighted={(selectedIds) => {
                const newSelectedId =
                  selectedIds.length === 1 ? selectedIds[0] : null;
                setSelectedId(newSelectedId);
              }}
              highlightedRows={new Set(selectedId)}
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

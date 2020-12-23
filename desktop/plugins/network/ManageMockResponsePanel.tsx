/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  Layout,
  ManagedTable,
  Text,
  FlexBox,
  FlexRow,
  FlexColumn,
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

type Props = {
  routes: {[id: string]: Route};
  highlightedRows: Set<string> | null | undefined;
  requests: {[id: string]: Request};
  responses: {[id: string]: Response};
};

const ColumnSizes = {route: 'flex'};

const Columns = {route: {value: 'Route', resizable: false}};

const AddRouteButton = styled(FlexBox)({
  color: colors.blackAlpha50,
  alignItems: 'center',
  padding: 5,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const CopyHighlightedCallsButton = styled(FlexBox)({
  color: colors.blueDark,
  alignItems: 'center',
  padding: 5,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const Container = styled(FlexRow)({
  flex: 1,
  justifyContent: 'space-around',
  alignItems: 'stretch',
  height: '100%',
  width: '100%',
});

const LeftPanel = styled(FlexColumn)({
  height: '100%',
  width: '35%',
});

const RightPanel = styled(FlexColumn)({
  flex: 2,
  height: '100%',
});

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
    <FlexRow grow={true}>
      <FlexRow onClick={props.handleRemoveId}>
        <Icon name="cross-circle" color={colors.red} />
      </FlexRow>
      <FlexRow grow={true}>
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
      </FlexRow>
    </FlexRow>
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
    <Container style={{height: 580}}>
      <LeftPanel>
        <AddRouteButton
          onClick={() => {
            networkRouteManager.addRoute();
          }}>
          <Glyph
            name="plus-circle"
            size={16}
            variant="outline"
            color={colors.blackAlpha30}
          />
          &nbsp;Add Route
        </AddRouteButton>
        <CopyHighlightedCallsButton
          onClick={() => {
            networkRouteManager.copyHighlightedCalls(
              props.highlightedRows as Set<string>,
              props.requests,
              props.responses,
            );
          }}>
            <Glyph
              name="plus-circle"
              size={16}
              variant="outline"
              color={colors.blackAlpha30}
            />
          &nbsp;Copy Highlighted Calls
        </CopyHighlightedCallsButton>
        <hr  
          style={{
            height: 1,
            backgroundColor: colors.grey,
            width: '95%'
          }}
        />
        <ManagedTable
          hideHeader={true}
          multiline={true}
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
      </LeftPanel>
      <RightPanel>
        {selectedId && props.routes.hasOwnProperty(selectedId) && (
          <Layout.ScrollContainer vertical style={{height: 500}}>
          <ManagedMockResponseRightPanel
            id={selectedId}
            route={props.routes[selectedId]}
            isDuplicated={duplicatedIds.includes(selectedId)}
          />
           </Layout.ScrollContainer>
        )}
      </RightPanel>
    </Container>
  );
}

/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {
  Component,
  ManagedTable,
  Text,
  FlexBox,
  FlexRow,
  FlexColumn,
  Glyph,
  styled,
  colors,
  Panel,
  ContextMenu,
} from 'flipper';
import React from 'react';

import {Route} from './types';

import {MockResponseDetails} from './MockResponseDetails';
import {RequestId, Header} from './types';
import {TableBodyRow} from 'src/ui';

type Props = {
  routes: Map<RequestId, Route>;
  handleRoutesChange: (routes: Map<RequestId, Route>) => void;
};

type State = {
  selectedIds: Array<RequestId>;
  routes: Map<RequestId, Route>;
};

const ColumnSizes = {
  route: 'flex',
};

const Columns = {
  route: {
    value: 'Route',
    resizable: false,
  },
};

const AddRouteButton = styled(FlexBox)({
  color: colors.blackAlpha50,
  alignItems: 'center',
  padding: 10,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const Container = styled(FlexRow)({
  flex: 1,
  justifyContent: 'space-around',
  alignItems: 'stretch',
});

const LeftPanel = styled(FlexColumn)({
  flex: 1,
});

const RightPanel = styled(FlexColumn)({
  flex: 3,
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

export class ManageMockResponsePanel extends Component<Props, State> {
  static ContextMenu = styled(ContextMenu)({
    flex: 1,
  });

  contextMenuItems() {
    return [
      {
        type: 'separator' as 'separator',
      },
      {
        label: 'Delete',
        click: this.deleteRoute,
      },
    ];
  }

  constructor(props: Props) {
    super(props);
    this.state = {
      ...this.state,
      selectedIds:
        this.props.routes !== undefined && this.props.routes.size > 0
          ? ['0']
          : [],
    };
  }

  deleteRoute = () => {
    const {selectedIds} = this.state;
    const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
    const routes = this.props.routes;
    if (selectedId !== null) {
      routes.delete(selectedId);
    }

    this.checkDuplicate(routes);

    this.setState(
      {
        selectedIds: [],
      },
      () => {
        this.props.handleRoutesChange(routes);
      },
    );
  };

  buildRows = () => {
    const {routes} = this.props;
    if (routes) {
      const rows: TableBodyRow[] = [];

      routes.forEach((route: Route, index: RequestId) => {
        rows.push(this.buildRow(route, index));
      });
      return rows;
    }
    return [];
  };

  buildRow = (route: Route, index: RequestId) => {
    return {
      columns: {
        route: {
          value: route.isDuplicate ? (
            <FlexRow>
              <Icon name="caution-triangle" color={colors.yellow} />
              <TextEllipsis>{route.requestUrl}</TextEllipsis>
            </FlexRow>
          ) : (
            <TextEllipsis>{route.requestUrl}</TextEllipsis>
          ),
        },
      },
      key: index,
    };
  };

  checkDuplicate = (routes: Map<RequestId, Route>) => {
    if (routes.size > 0) {
      const duplicateMap: {[key: string]: boolean} = {};
      routes.forEach((r: Route) => {
        if (duplicateMap[r.method + '|' + r.requestUrl]) {
          r.isDuplicate = true;
        } else {
          r.isDuplicate = false;
          duplicateMap[r.method + '|' + r.requestUrl] = true;
        }
      });
    }
  };

  addRow = () => {
    const route = {
      requestUrl: '/',
      method: 'GET',
      data: '',
      headers: new Map<RequestId, Header>(),
      isDuplicate: false,
    };
    const newKey = this.props.routes.size > 0 ? this.props.routes.size : 0;
    const routes = this.props.routes;
    routes.set(newKey + '', route);

    this.checkDuplicate(routes);

    this.props.handleRoutesChange(routes);

    this.setState({
      selectedIds: [routes.size - 1 + ''],
    });
  };

  onRowHighlighted = (selectedIds: Array<RequestId>) =>
    this.setState({selectedIds: selectedIds});

  handleRouteChange = (selectedId: RequestId, route: Route) => {
    const routes = this.props.routes;

    // Set route
    routes.set(selectedId, route);

    // Check duplicate
    this.checkDuplicate(routes);

    this.setState(
      {
        ...this.state,
        routes: routes,
      },
      () => {
        this.props.handleRoutesChange(routes);
      },
    );
  };

  renderSidebar = () => {
    const {selectedIds} = this.state;
    const {routes} = this.props;
    const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
    const route = selectedId ? routes.get(selectedId) : null;
    return selectedId != null && route != null ? (
      <Panel
        grow={true}
        collapsable={false}
        floating={false}
        heading={'Route Info'}>
        <MockResponseDetails
          key={selectedId}
          id={selectedId}
          route={route}
          handleRouteChange={this.handleRouteChange}
        />
      </Panel>
    ) : null;
  };

  render() {
    return (
      <Container>
        <LeftPanel>
          <AddRouteButton onClick={this.addRow}>
            <Glyph
              name="plus-circle"
              size={16}
              variant="outline"
              color={colors.blackAlpha30}
            />
            &nbsp;Add Route
          </AddRouteButton>
          <ManageMockResponsePanel.ContextMenu
              component={FlexColumn}
              items={this.contextMenuItems()}>
            <ManagedTable
              hideHeader={true}
              multiline={true}
              columnSizes={ColumnSizes}
              columns={Columns}
              rows={this.buildRows()}
              stickyBottom={true}
              autoHeight={false}
              floating={false}
              zebra={false}
              onRowHighlighted={this.onRowHighlighted}
              highlightedRows={
                this.state.selectedIds
                  ? new Set(this.state.selectedIds)
                  : undefined
              }
            />
          </ManageMockResponsePanel.ContextMenu>
        </LeftPanel>

        <RightPanel>{this.renderSidebar()}</RightPanel>
      </Container>
    );
  }
}

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

import {Route} from './types';

import {MockResponseDetails} from './MockResponseDetails';
import type {RequestId} from './types';

type Props = {
  routes: Route[],
  handleRoutesChange: (routes: Route[]) => void,
};

type State = {
  selectedIds: [],
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
        type: 'separator',
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
      selectedIds:
        this.props.routes !== undefined && this.props.routes.length > 0
          ? [0]
          : [],
    };
  }

  deleteRoute = () => {
    const {selectedIds} = this.state;
    const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
    const routes = this.props.routes;
    routes.splice(selectedId, 1);

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
      const rows = [];
      routes.forEach((route: Route, index: number) => {
        rows.push(this.buildRow(route, index));
      });
      return rows;
    }
    return [];
  };

  buildRow = (route: Route, index: number) => {
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

  checkDuplicate = (routes: Route[]) => {
    const duplicateMap = {};
    routes.forEach((r: Route, index: number) => {
      if (duplicateMap[r.method + '|' + r.requestUrl]) {
        r.isDuplicate = true;
      } else {
        r.isDuplicate = false;
        duplicateMap[r.method + '|' + r.requestUrl] = true;
      }
    });
  };

  addRow = () => {
    const route = {
      requestUrl: '/',
      method: 'GET',
    };
    const newRoutes = [...this.props.routes, route];

    this.checkDuplicate(newRoutes);

    this.props.handleRoutesChange(newRoutes);

    this.setState({
      selectedIds: [newRoutes.length - 1],
    });
  };

  onRowHighlighted = (selectedIds: Array<RequestId>) =>
    this.setState({selectedIds: selectedIds});

  handleRouteChange = (selectedId: RequestId, route: Route) => {
    const routes = this.props.routes;

    // Set route
    routes[selectedId] = route;

    // Check duplicate
    this.checkDuplicate(routes);

    this.setState(
      {
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

    return selectedId != null ? (
      <Panel
        grow={true}
        collapsable={false}
        floating={false}
        heading={'Route Info'}>
        <MockResponseDetails
          key={selectedId}
          id={selectedId}
          route={routes[selectedId]}
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
          <ManageMockResponsePanel.ContextMenu items={this.contextMenuItems()}>
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
                this.state.selectedIds ? new Set(this.state.selectedIds) : null
              }
            />
          </ManageMockResponsePanel.ContextMenu>
        </LeftPanel>

        <RightPanel>{this.renderSidebar()}</RightPanel>
      </Container>
    );
  }
}

import {
  PureComponent,
  ManagedTable,
  Text,
  FlexBox,
  FlexColumn,
  Glyph,
  styled,
  colors,
  FlexRow,
  Panel
} from 'flipper';

import {
  Route
} from "./types";

import {
  MockResponseDetails
} from "./MockResponseDetails";
import type {RequestId} from "./types";

type State = {
  routes: Route [],
  selectedIds: []
};

const ColumnSizes = {
  route: 50
};

const Columns = {
  route: {
    value: 'Route',
    resizable: false,
  }
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
  alignItems: 'stretch'
});

const LeftPanel = styled(FlexColumn)({
  flex: 1
});

const RightPanel = styled(FlexColumn)({
  flex:3,
  height: '100%'
});

export class ManageMockResponsePanel extends PureComponent<*, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      routes: [],
      selectedIds: []
    }
  }

  buildRows = (state: State) => {
    if (state.routes) {
      let rows = [];
      state.routes.forEach((route: Route, index: number) => {
        rows.push(this.buildRow(route, index));
      });
      return rows;
    }
    return [];
  };

  buildRow = (route: Route, index: number ) => {
    return {
      columns: {
        route: {
          value: <Text>{route.requestUrl}</Text>
        }
      },
      key: index
    }
  };

  addRow = () => {
    const route = {
      requestUrl: '/',
      method: 'GET'
    };
    this.setState({
      routes: [...this.state.routes, route]
    });
  };

  onRowHighlighted = (selectedIds: Array<RequestId>) =>
    this.setState({selectedIds: selectedIds});

  handleRouteChange = (selectedId: RequestId, route: Route) => {
    const routes = this.state.routes;
    routes[selectedId] = route;
    this.setState({
      routes: routes
    });
  };

  renderSidebar = () => {
    const { selectedIds, routes} = this.state;
    const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
    return selectedId != null ? (
      <Panel
        grow={true}
        collapsable={false}
        floating={false}
        heading={'Response'} >
        <MockResponseDetails
          id={selectedId}
          key={selectedId}
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
              color={colors.blackAlpha30}/>
            &nbsp;Add Route
          </AddRouteButton>
          <ManagedTable
            hideHeader={true}
            multiline={true}
            columnSizes={ColumnSizes}
            columns={Columns}
            rows={this.buildRows(this.state)}
            stickyBottom={true}
            autoHeight={false}
            floating={false}
            zebra={false}
            onRowHighlighted={this.onRowHighlighted}
            highlightedRows={
              this.state.selectedIds ? new Set(this.state.selectedIds) : null
            }
          />
        </LeftPanel>

        <RightPanel>
          {this.renderSidebar()}
        </RightPanel>
      </Container>
    );
  }
}
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
import React from "react";

type Props = {
  a: boolean
};

type State = {
  routes: Route []
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

const AddRouteButton = styled(FlexBox)(props => ({
  color: colors.blackAlpha50,
  alignItems: 'center',
  padding: 10,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}));

const Container = styled(FlexRow)({
  flex: 1,
  justifyContent: 'space-around',
  alignItems: 'stretch'
});

const LeftPanel = styled(FlexColumn)({
  flex: 1
});

export class ManageMockResponsePanel extends PureComponent<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      routes: []
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
    console.log(route);
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
      requestUrl: '/test',
      method: 'GET'
    };
    this.setState({
      routes: [...this.state.routes, route]
    });
  };

  render() {

    const route = null; // {requestUrl: ''};
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
          />
        </LeftPanel>

        <FlexColumn style={{flex:3, height: '100%'}}>
          <Panel
            grow={true}
            collapsable={false}
            floating={false}
            heading={'Response'} >
            <MockResponseDetails route={route} />
          </Panel>
        </FlexColumn>
      </Container>
    );
  }
}
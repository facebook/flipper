/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import {
  Text,
  Panel,
  ManagedDataInspector,
  FlipperPlugin,
  DetailSidebar,
  FlexRow,
  FlexColumn,
  styled,
  colors,
} from 'flipper';
import React from 'react';

type Id = number;

type Row = {
  id: Id,
  title: string,
  url: string,
};

function renderSidebar(row: Row) {
  return (
    <Panel floating={false} heading={'Extras'}>
      <ManagedDataInspector data={row} expandRoot={true} />
    </Panel>
  );
}

type State = {
  selectedIndex: number,
};

type PersistedState = {
  data: Array<Row>,
};

export default class SeaMammals extends FlipperPlugin<
  State,
  void,
  PersistedState,
> {
  static defaultPersistedState = {
    data: [],
  };

  static persistedStateReducer = (
    persistedState: PersistedState,
    method: string,
    payload: Row,
  ) => {
    if (method === 'newRow') {
      return {
        data: [...persistedState.data, payload],
      };
    }
    return persistedState;
  };

  static Container = styled(FlexRow)({
    backgroundColor: colors.macOSTitleBarBackgroundBlur,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    alignContent: 'flex-start',
    flexGrow: 1,
  });

  state = {
    selectedIndex: -1,
  };

  render() {
    const {selectedIndex} = this.state;
    const {data} = this.props.persistedState;

    return (
      <SeaMammals.Container>
        {data.map((row, i) => (
          <Card
            {...row}
            onSelect={() => this.setState({selectedIndex: i})}
            selected={i === selectedIndex}
            key={i}
          />
        ))}
        <DetailSidebar>
          {this.state.selectedIndex > -1 &&
            renderSidebar(this.props.persistedState.data[selectedIndex])}
        </DetailSidebar>
      </SeaMammals.Container>
    );
  }
}

class Card extends React.Component<{
  ...Row,
  onSelect: () => void,
  selected: boolean,
}> {
  static Container = styled(FlexColumn)(props => ({
    margin: 10,
    borderRadius: 5,
    border: '2px solid black',
    backgroundColor: colors.white,
    borderColor: props.selected
      ? colors.macOSTitleBarIconSelected
      : colors.white,
    padding: 0,
    width: 150,
    overflow: 'hidden',
    boxShadow: '1px 1px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
  }));

  static Image = styled('div')({
    backgroundSize: 'cover',
    width: '100%',
    paddingTop: '100%',
  });

  static Title = styled(Text)({
    fontSize: 14,
    fontWeight: 'bold',
    padding: '10px 5px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  });

  render() {
    return (
      <Card.Container
        onClick={this.props.onSelect}
        selected={this.props.selected}>
        <Card.Image style={{backgroundImage: `url(${this.props.url || ''})`}} />
        <Card.Title>{this.props.title}</Card.Title>
      </Card.Container>
    );
  }
}

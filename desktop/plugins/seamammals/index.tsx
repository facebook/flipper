/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
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
  id: Id;
  title: string;
  url: string;
};

function renderSidebar(row: Row) {
  return (
    <Panel floating={false} heading={'Extras'}>
      <ManagedDataInspector data={row} expandRoot={true} />
    </Panel>
  );
}

type State = {
  selectedID: string | null;
};

type PersistedState = {
  [key: string]: Row;
};

export default class SeaMammals extends FlipperPlugin<
  State,
  any,
  PersistedState
> {
  static defaultPersistedState = {};

  static persistedStateReducer<PersistedState>(
    persistedState: PersistedState,
    method: string,
    payload: Row,
  ) {
    if (method === 'newRow') {
      return Object.assign({}, persistedState, {
        [payload.id]: payload,
      });
    }
    return persistedState;
  }

  static Container = styled(FlexRow)({
    backgroundColor: colors.macOSTitleBarBackgroundBlur,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    alignContent: 'flex-start',
    flexGrow: 1,
    overflow: 'scroll',
  });

  state = {
    selectedID: null as string | null,
  };

  render() {
    const {selectedID} = this.state;
    const {persistedState} = this.props;

    return (
      <SeaMammals.Container>
        {Object.entries(persistedState).map(([id, row]) => (
          <Card
            {...row}
            onSelect={() => this.setState({selectedID: id})}
            selected={id === selectedID}
            key={id}
          />
        ))}
        <DetailSidebar>
          {selectedID && renderSidebar(persistedState[selectedID])}
        </DetailSidebar>
      </SeaMammals.Container>
    );
  }
}

class Card extends React.Component<
  {
    onSelect: () => void;
    selected: boolean;
  } & Row
> {
  static Container = styled(FlexColumn)<{selected?: boolean}>((props) => ({
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

  static Image = styled.div({
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

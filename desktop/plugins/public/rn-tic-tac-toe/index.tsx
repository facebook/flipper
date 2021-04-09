/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {
  FlipperPlugin,
  RoundedSection,
  Button,
  produce,
  CenteredView,
  Info,
  colors,
  styled,
  FlexRow,
  Text,
  brandColors,
} from 'flipper';
import {Draft} from 'immer';

type Player = ' ' | 'X' | 'O';

type State = {
  cells: readonly [
    Player,
    Player,
    Player,
    Player,
    Player,
    Player,
    Player,
    Player,
    Player,
  ];
  winner: Player;
  turn: 'X' | 'O';
};

function initialState(): State {
  return {
    // Cells
    // 0 1 2
    // 3 4 5
    // 6 7 8
    cells: [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '] as const,
    turn: Math.random() < 0.5 ? 'O' : 'X',
    winner: ' ',
  } as const;
}

const computeNextState = produce(
  (draft: Draft<State>, cell: number, player: 'X' | 'O') => {
    draft.cells[cell] = player;
    draft.turn = player === 'X' ? 'O' : 'X';
    draft.winner = computeWinner(draft.cells);
  },
);

function computeWinner(c: State['cells']): Player {
  // check the 2 diagonals
  if ((c[0] === c[4] && c[0] === c[8]) || (c[2] === c[4] && c[2] === c[6])) {
    return c[4];
  }
  for (let i = 0; i < 3; i++) {
    // check vertical
    if (c[i] === c[3 + i] && c[i] === c[6 + i]) {
      return c[i];
    }
    // check horizontal
    if (c[i * 3] === c[i * 3 + 1] && c[i * 3] === c[i * 3 + 2]) {
      return c[i * 3];
    }
  }
  return ' ';
}

export default class ReactNativeTicTacToe extends FlipperPlugin<
  State,
  any,
  any
> {
  state = initialState();

  componentDidMount() {
    this.client.subscribe('XMove', ({move}: {move: number}) => {
      this.makeMove('X', move);
    });
    this.client.subscribe('GetState', () => {
      this.sendUpdate();
    });
    this.sendUpdate();
  }

  makeMove(player: 'X' | 'O', move: number) {
    if (this.state.turn === player && this.state.cells[move] === ' ') {
      this.setState(computeNextState(this.state, move, player), () =>
        this.sendUpdate(),
      );
    }
  }

  sendUpdate() {
    this.client.call('SetState', this.state);
  }

  handleCellClick(move: number) {
    this.makeMove('O', move);
  }

  handleReset() {
    this.setState(initialState(), () => this.sendUpdate());
  }

  render() {
    const {winner, turn, cells} = this.state;
    return (
      <CenteredView>
        <RoundedSection title="React Native Tic-Tac-Toe">
          <Info type="info">
            This plugin demonstrates how to create pure JavaScript Flipper
            plugins for React Native. Find out how to create a similar plugin at{' '}
            <a href="https://fbflipper.com/docs/tutorial/intro" target="blank">
              fbflipper.com
            </a>
            .
          </Info>
          <Container>
            <Text size={24}>Flipper Tic-Tac-Toe</Text>
            <br />
            <br />
            <Text size={18}>
              {winner !== ' '
                ? `Winner! ${winner}`
                : turn === 'O'
                ? 'Your turn'
                : 'Mobile players turn..'}
            </Text>
            <GameBoard>
              {cells.map((c, idx) => (
                <Cell
                  key={idx}
                  disabled={c !== ' ' || turn != 'O' || winner !== ' '}
                  onClick={() => this.handleCellClick(idx)}>
                  {c}
                </Cell>
              ))}
            </GameBoard>
            <Button onClick={() => this.handleReset()}>Start new game</Button>
          </Container>
        </RoundedSection>
      </CenteredView>
    );
  }
}

const Container = styled('div')({
  border: `4px solid ${brandColors.Flipper}`,
  borderRadius: 4,
  padding: 20,
  marginTop: 20,
});

const GameBoard = styled(FlexRow)({
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  marginTop: 20,
  marginBottom: 20,
});

const Cell = styled('button')({
  padding: 20,
  height: 80,
  minWidth: 80,
  fontSize: 24,
  margin: 20,
  flex: 0,
  borderRadius: 4,
  backgroundColor: colors.highlight,
  color: 'white',
  ':disabled': {
    backgroundColor: colors.greyTint2,
  },
});

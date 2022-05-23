/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Typography, Button, Alert, Space} from 'antd';
import {Draft} from 'immer';
import {
  createState,
  PluginClient,
  usePlugin,
  useValue,
  styled,
  theme,
  Layout,
  FlipperPluginInstance,
} from 'flipper-plugin';

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

const computeNextState =
  (cell: number, player: 'X' | 'O') => (draft: Draft<State>) => {
    draft.cells[cell] = player;
    draft.turn = player === 'X' ? 'O' : 'X';
    draft.winner = computeWinner(draft.cells);
  };

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

type Events = {
  XMove: {move: number};
  GetState: never;
};

type Methods = {
  SetState: (state: State) => Promise<void>;
};

export const plugin = (client: PluginClient<Events, Methods>) => {
  const state = createState(initialState());

  const sendUpdate = () => {
    client.send('SetState', state.get());
  };

  const makeMove = (player: 'X' | 'O', move: number) => {
    if (state.get().turn === player && state.get().cells[move] === ' ') {
      state.update(computeNextState(move, player));
      sendUpdate();
    }
  };

  const reset = () => {
    state.set(initialState());
    sendUpdate();
  };

  client.onConnect(() => {
    client.onMessage('XMove', ({move}) => {
      makeMove('X', move);
    });
    client.onMessage('GetState', () => {
      sendUpdate();
    });
    sendUpdate();
  });

  return {
    makeMove,
    reset,
    state,
  };
};

export const API = (pluginInstance: FlipperPluginInstance<typeof plugin>) => {
  return {
    makeMove: pluginInstance.makeMove,
    reset: pluginInstance.reset,
    state: pluginInstance.state,
  };
};

const desktopPlayer = 'O';

export const Component = () => {
  const pluginInstance = usePlugin(plugin);
  const {winner, turn, cells} = useValue(pluginInstance.state);

  return (
    <Layout.Container>
      <Space direction="vertical" align="center">
        <Alert
          message={
            <>
              This plugin demonstrates how to create pure JavaScript Flipper
              plugins for React Native. Find out how to create a similar plugin
              at{' '}
              <a
                href="https://fbflipper.com/docs/tutorial/intro"
                target="blank">
                fbflipper.com
              </a>
              .
            </>
          }
          type="info"
        />
        <Typography.Title>Flipper Tic-Tac-Toe</Typography.Title>
        <Typography.Text>
          {winner !== ' '
            ? `Winner! ${winner}`
            : turn === 'O'
            ? 'Your turn'
            : 'Mobile players turn..'}
        </Typography.Text>
        <GameBoard>
          {cells.map((c, idx) => (
            <Cell
              key={idx}
              disabled={c !== ' ' || turn != desktopPlayer || winner !== ' '}
              onClick={() => pluginInstance.makeMove(desktopPlayer, idx)}>
              {c}
            </Cell>
          ))}
        </GameBoard>
        <Button onClick={() => pluginInstance.reset()}>Start new game</Button>
      </Space>
    </Layout.Container>
  );
};

const GameBoard = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 80px)',
  gridTemplateRows: 'repeat(3, 80px)',
  justifyContent: 'center',
  gap: 10,
});

const Cell = styled('button')({
  padding: 20,
  width: '100%',
  height: '100%',
  minWidth: 80,
  fontSize: 24,
  flex: 0,
  borderRadius: 4,
  backgroundColor: theme.backgroundDefault,
  color: 'white',
  ':disabled': {
    backgroundColor: theme.disabledColor,
  },
});

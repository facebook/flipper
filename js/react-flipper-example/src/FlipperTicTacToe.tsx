/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useState, useEffect, FC} from 'react';
import type {FlipperPluginConnection, FlipperClient} from 'js-flipper';
import './FlipperTicTacToe.css';

// DOCS_START_CLIENT_START
// We want to import and start flipper client only in development and test modes
let flipperClientPromise: Promise<FlipperClient> | undefined;
if (process.env.NODE_ENV !== 'production') {
  flipperClientPromise = import('js-flipper').then(({flipperClient}) => {
    flipperClient.start('React Tic-Tac-Toe');
    return flipperClient;
  });
}
// DOCS_START_CLIENT_END

interface GameState {
  cells: string[];
  turn: string;
  winner: string;
}

const FlipperTicTacToe: FC = () => {
  // DOCS_ADD_PLUGIN_START
  // TicTacToe game status
  const [status, setStatus] = useState('Waiting for Flipper Desktop Player...');
  // TicTacToe game state
  const [gameState, setGameState] = useState<GameState>({
    cells: [],
    turn: ' ',
    winner: ' ',
  });
  // Flipper connection instance
  const [connection, setConnection] = useState<FlipperPluginConnection>();

  useEffect(() => {
    flipperClientPromise?.then(flipperClient => {
      flipperClient.addPlugin({
        getId() {
          // Name of the plugin
          return 'ReactNativeTicTacToe';
        },
        onConnect(connection) {
          // Once we connected, we display it to the user
          setStatus('Desktop player present');
          // And stash the connection object
          setConnection(connection);

          // We start listening to updates from Flipper Desktop
          connection.receive('SetState', (gameState: GameState) => {
            if (gameState.winner !== ' ') {
              setStatus(
                `Winner is ${gameState.winner}! Waiting for a new game...`,
              );
            } else {
              setStatus(
                gameState.turn === 'X'
                  ? 'Your turn...'
                  : 'Awaiting desktop players turn...',
              );
            }
            setGameState(gameState);
          });

          // We also request the initial state of the game from Flipper Desktop
          connection.send('GetState');
        },
        onDisconnect() {
          // When Flipper Desktop disconnects, we show it to the user
          setConnection(undefined);
          setStatus('Desktop player gone...');
        },
      });
    });
  }, []);
  // DOCS_ADD_PLUGIN_END

  return (
    <div>
      <p>{status}</p>
      <div className="grid">
        {gameState.cells.map((state, idx) => (
          <button
            key={idx}
            disabled={!connection || gameState.turn !== 'X' || state !== ' '}
            onClick={() => connection?.send('XMove', {move: idx})}
            className="cell"
          >
            {state}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FlipperTicTacToe;

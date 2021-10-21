/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useState, useEffect, FC} from 'react';
import type {FlipperPluginConnection, FlipperClient} from 'js-flipper';
import './FlipperTicTacToe.css';

// We want to import and start flipper client only in development and test modes
let flipperClientPromise: Promise<FlipperClient> | undefined;
if (process.env.NODE_ENV !== 'production') {
  flipperClientPromise = import('js-flipper').then(({flipperClient}) => {
    flipperClient.start('React Tic-Tac-Toe');
    return flipperClient;
  });
}

interface GameState {
  cells: string[];
  turn: string;
  winner: string;
}

const FlipperTicTacToe: FC = () => {
  const [status, setStatus] = useState('Waiting for Flipper Desktop Player...');
  const [gameState, setGameState] = useState<GameState>({
    cells: [],
    turn: ' ',
    winner: ' ',
  });
  const [connection, setConnection] = useState<FlipperPluginConnection>();

  useEffect(() => {
    flipperClientPromise?.then(flipperClient => {
      flipperClient.addPlugin({
        getId() {
          return 'ReactNativeTicTacToe';
        },
        onConnect(connection) {
          setStatus('Desktop player present');
          setConnection(connection);

          // listen to updates
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

          // request initial state
          connection.send('GetState');
        },
        onDisconnect() {
          setConnection(undefined);
          setStatus('Desktop player gone...');
        },
      });
    });
  }, []);

  return (
    <div>
      <p>{status}</p>
      <div className="grid">
        {gameState.cells.map((state, idx) => (
          <button
            key={idx}
            disabled={!connection || gameState.turn !== 'X' || state !== ' '}
            onClick={() => connection?.send('XMove', {move: idx})}
            className="cell">
            {state}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FlipperTicTacToe;

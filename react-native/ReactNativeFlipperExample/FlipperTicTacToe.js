/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useState, useEffect} from 'react';
import {StyleSheet, View, Text, Button} from 'react-native';

import {addPlugin} from 'react-native-flipper';

export default function FlipperTicTacToe() {
  const [status, setStatus] = useState('Waiting for Flipper Desktop Player...');
  const [gameState, setGameState] = useState({
    cells: [],
    turn: ' ',
    winner: ' ',
  });
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    addPlugin({
      getId() {
        return 'ReactNativeTicTacToe';
      },
      onConnect(connection) {
        setStatus('Desktop player present');
        setConnection(connection);

        // listen to updates
        connection.receive('SetState', (gameState, responder) => {
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
          responder.success();
        });

        // request initial state
        connection.send('GetState');
      },
      onDisconnect() {
        setConnection(null);
        setStatus('Desktop player gone...');
      },
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Flipper Tic-Tac-Toe</Text>
      <Text>{status}</Text>
      <View style={styles.board}>
        {gameState.cells.map((state, idx) => (
          <View key={idx} style={styles.cell}>
            <Button
              title={state}
              disabled={!connection || gameState.turn !== 'X' || state !== ' '}
              onPress={() => {
                connection?.send('XMove', {move: idx});
              }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#8155cb',
    padding: 10,
  },
  cell: {
    flex: 0,
    width: '33%',
    padding: 5,
  },
  title: {
    fontSize: 24,
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});

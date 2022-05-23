/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const {FlipperServerClient} = require('./flipperClient');
const inquirer = require('inquirer');
const {player, ticTacToePluginId} = require('./consts');

// Built based on https://codeburst.io/building-a-node-js-interactive-cli-3cb80ed76c86
class TicTacToeClient {
  flipperServerClient = new FlipperServerClient();

  async init() {
    console.log('Connecting to Flipper Server...');
    await this.flipperServerClient.init();
    console.log('Connected to Flipper Server');
  }

  printBoard(cells) {
    console.log('|   | 0 | 1 | 2 |');
    console.log(`| a | ${cells[0]} | ${cells[1]} | ${cells[2]} |`);
    console.log(`| b | ${cells[3]} | ${cells[4]} | ${cells[5]} |`);
    console.log(`| c | ${cells[6]} | ${cells[7]} | ${cells[8]} |`);
  }

  async onStateUpdate(clientId, {winner, turn, cells}) {
    try {
      if (winner !== ' ') {
        const {next} = await inquirer.prompt([
          {
            type: 'list',
            name: 'next',
            message: `Game finished! ${
              winner === player
                ? 'You won!!! 🥳🎉🎇'
                : 'Not this time, rookie. Try harder.'
            }`,
            choices: ['Try again', 'Exit game'],
            default: 0,
          },
        ]);

        if (next === 'Exit game') {
          process.exit(0);
          return;
        }
        await this.reset(clientId);
        return;
      }

      this.printBoard(cells);

      if (turn === player) {
        const {move} = await inquirer.prompt([
          {
            type: 'list',
            name: 'move',
            message: 'Your turn...',
            choices: cells
              .map((value, i) => {
                // 97 - "a" in ASCII, 98 - "b", 99 - "c"
                const code0 = 97 + Math.floor(i / 3);
                const code1 = i % 3;
                const encoded = `${String.fromCharCode(code0)}${code1}`;

                return value === ' ' ? {name: encoded, value: i} : null;
              })
              .filter((val) => !!val),
            default: 0,
          },
        ]);
        this.move(clientId, move);
        return;
      }

      console.log('Waiting for the mobile player...');
    } catch (e) {
      console.error('TicTacToeClient.onStateUpdate -> error', e);
      process.exit(1);
    }
  }

  async startGame(clientId) {
    console.log('Starting game...');
    const state = await this.flipperServerClient.exec(
      'companion-plugin-subscribe',
      [clientId, ticTacToePluginId, 'state'],
    );
    console.log('Game on!');

    this.onStateUpdate(clientId, state);

    this.flipperServerClient.on(
      'companion-plugin-state-update',
      async ({data}) => this.onStateUpdate(clientId, data),
    );
  }

  async move(clientId, cell) {
    console.log('Sending your move...');
    await this.flipperServerClient.exec('companion-plugin-exec', [
      clientId,
      ticTacToePluginId,
      'makeMove',
      [player, cell],
    ]);
    console.log('Sent your move');
  }

  async reset(clientId) {
    console.log('Restarting...');
    await this.flipperServerClient.exec('companion-plugin-exec', [
      clientId,
      ticTacToePluginId,
      'reset',
    ]);
  }

  async startTicTacToePlugin(clientId) {
    console.log('Querying available plugins...');
    const availablePlugins = await this.flipperServerClient.exec(
      'companion-plugin-list',
      [clientId],
    );
    console.log('Available plugins:', JSON.stringify(availablePlugins));

    if (
      !availablePlugins.some(({pluginId}) => pluginId === ticTacToePluginId)
    ) {
      throw new Error('Tic-Tac-Toe plugin is not supported by the app');
    }

    console.log('Starting Tic-Tac-Toe plugin...');

    await this.flipperServerClient.exec('companion-plugin-start', [
      clientId,
      ticTacToePluginId,
    ]);

    console.log('Started Tic-Tac-Toe plugin');
  }

  async selectClient() {
    console.log('Querying connected clients...');
    const clients = await this.flipperServerClient.exec('client-list', []);
    console.log('Found clients: ', JSON.stringify(clients));

    if (!clients.length) {
      throw new Error(
        'No clinets connected. Please, start your app and try again.',
      );
    }

    const {clientId} = await inquirer.prompt([
      {
        type: 'list',
        name: 'clientId',
        message: 'Choose your client (application)',
        choices: clients.map(({id, query}) => ({
          name: `${query.app} (${query.os}) on ${query.device}`,
          value: id,
        })),
        default: 0,
      },
    ]);

    return clientId;
  }
}

module.exports = {TicTacToeClient};

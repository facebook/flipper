#!/usr/bin/env node
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const {TicTacToeClient} = require('./ticTacToeClient');

const main = async () => {
  const ticTacToeClient = new TicTacToeClient();
  await ticTacToeClient.init();

  const targetClientId = await ticTacToeClient.selectClient();
  await ticTacToeClient.startTicTacToePlugin(targetClientId);
  ticTacToeClient.startGame(targetClientId);
};

main().catch((e) => {
  console.error('main -> error', e);
  process.exit(1);
});

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Application} from 'spectron';
import assert from 'assert';
import path from 'path';

const app = new Application({
  path: path.join(
    __dirname,
    '..',
    '..',
    'dist',
    'mac',
    'Flipper.app',
    'Contents',
    'MacOS',
    'Flipper',
  ),
  args: ['--no-launcher'],
});

async function testSuite(app: Application) {
  await app.client.waitUntilWindowLoaded();
  app.browserWindow.focus();
  await app.client.waitUntilTextExists('html', 'Changelog');
  await app.client.$('div[type="primary"]=Close').click();
  await app.client.$('div=Manage Plugins').click();
}

export default function test() {
  return app
    .start()
    .then(async function () {
      await app.client.waitUntilWindowLoaded();
    })
    .then(function () {
      // Check if the window is visible
      return app.browserWindow.isVisible();
    })
    .then(function (isVisible) {
      // Verify the window is visible
      assert.equal(isVisible, true);
    })
    .then(function () {
      // Get the window's title
      return app.client.getTitle();
    })
    .then(function (title) {
      // Verify the window's title
      assert.equal(title, 'Flipper');
    })
    .then(async function () {
      await testSuite(app);
    })
    .then(function () {
      // Stop the application
      return app.stop();
    })
    .catch(function (error) {
      // Log any failures
      console.error('Test failed', error.message);
      process.exit(1);
    })
    .then(function () {
      console.log('Test suite succeeded.');
    });
}

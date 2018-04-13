/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import {GK} from 'sonar';
import logs from './logs/index.js';
import cpu from './cpu/index.js';
import screen from './screen/index.js';

const plugins = [logs];

if (GK.get('sonar_uiperf')) {
  plugins.push(cpu);
}

if (GK.get('sonar_screen_plugin')) {
  plugins.push(screen);
}

export const devicePlugins = plugins;

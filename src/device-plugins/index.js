/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {SonarDevicePlugin} from '../plugin.js';

import {GK} from 'sonar';
import logs from './logs/index.js';
import cpu from './cpu/index.js';

const plugins: Array<Class<SonarDevicePlugin<any>>> = [logs];

if (GK.get('sonar_uiperf')) {
  plugins.push(cpu);
}

export const devicePlugins = plugins;

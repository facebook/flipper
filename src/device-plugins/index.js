/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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

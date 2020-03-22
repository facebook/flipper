/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperPlugin} from '../api';

import type {FlipperPluginID} from '../api';

type EventId = string;

export type AnalyticsEvent = {
  id: EventId,
  module: string,
  name: string,
  time: number,
  filter: ?string,
  highpri: ?boolean,
  extras: any,
};

export class AnalyticsLoggingFlipperPlugin extends FlipperPlugin {
  id: FlipperPluginID = 'AnalyticsLogging';

  sendEvent(event: AnalyticsEvent) {
    this._connection && this._connection.send('reportEvent', event);
  }
}
